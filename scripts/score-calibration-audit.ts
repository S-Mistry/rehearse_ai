import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadEnvConfig } from "@next/env";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { questionBank } from "../src/lib/rehearse/questions/question-bank";
import { buildEvaluatorAuditPrompt, EVALUATOR_AUDIT_PROMPT_VERSION } from "../src/lib/rehearse/prompts/evaluator-audit";
import { getOpenAIClient } from "../src/lib/openai/client";
import { evaluateAnswerHeuristically } from "../src/lib/rehearse/scoring/evaluate-answer";
import { applySpikeCaseDefaults, scoreModelSpikeCases, type ScoreModelSpikeCase } from "./fixtures/score-model-spike";

const auditedCriterionSchema = z.object({
  status: z.enum(["missing", "weak", "covered"]),
  reason: z.string(),
  evidence: z.string().nullable(),
  overMarkedRisk: z.boolean(),
});

const auditSchema = z.object({
  scoreCeiling: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  inflationRisk: z.enum(["low", "medium", "high"]),
  summary: z.string(),
  criterionAudit: z.object({
    situation: auditedCriterionSchema,
    task: auditedCriterionSchema,
    action: auditedCriterionSchema,
    result: auditedCriterionSchema,
    metric: auditedCriterionSchema,
    ownership: auditedCriterionSchema,
    reflection: auditedCriterionSchema,
    tradeoff: auditedCriterionSchema,
    resistance: auditedCriterionSchema,
    strategic_layer: auditedCriterionSchema,
  }),
});

const criteria = [
  "situation",
  "task",
  "action",
  "result",
  "metric",
  "ownership",
  "reflection",
  "tradeoff",
  "resistance",
  "strategic_layer",
] as const;

type CriterionKey = (typeof criteria)[number];

async function main() {
  loadEnvConfig(process.cwd());

  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is required to run the calibration audit.");
    process.exitCode = 1;
    return;
  }

  const client = getOpenAIClient();
  if (!client) {
    console.error("OpenAI client is unavailable.");
    process.exitCode = 1;
    return;
  }

  const report = [];
  const criterionSummary = new Map<string, { expectedChecks: number; auditorChecks: number; falsePositives: number; falseNegatives: number; auditorFlags: number }>();
  let inflatedScoreCount = 0;
  let deflatedScoreCount = 0;

  for (const spikeCase of scoreModelSpikeCases) {
    const question = questionBank.find((item) => item.code === spikeCase.questionCode);
    if (!question) {
      throw new Error(`Question ${spikeCase.questionCode} not found.`);
    }

    const input = applySpikeCaseDefaults(spikeCase, question);
    const primary = evaluateAnswerHeuristically(input);
    const auditStartedAt = Date.now();
    const response = await client.responses.parse({
      model: "gpt-4.1",
      input: [
        { role: "system", content: "Return strict rubric audit JSON only." },
        { role: "user", content: buildEvaluatorAuditPrompt(input) },
      ],
      text: {
        format: zodTextFormat(auditSchema, "rubric_audit"),
      },
    });

    const parsedAudit = response.output_parsed;
    if (!parsedAudit) {
      throw new Error(`Audit model did not return a structured result for ${spikeCase.id}.`);
    }

    const comparisons = compareAgainstExpectations(spikeCase, primary.evaluation, parsedAudit);
    inflatedScoreCount += comparisons.inflatedScore ? 1 : 0;
    deflatedScoreCount += comparisons.deflatedScore ? 1 : 0;

    for (const criterion of criteria) {
      const existing =
        criterionSummary.get(criterion) ?? {
          expectedChecks: 0,
          auditorChecks: 0,
          falsePositives: 0,
          falseNegatives: 0,
          auditorFlags: 0,
        };
      const result = comparisons.criterionChecks[criterion];
      existing.auditorChecks += 1;
      if (result.expected) {
        existing.expectedChecks += 1;
      }
      if (result.falsePositive) {
        existing.falsePositives += 1;
      }
      if (result.falseNegative) {
        existing.falseNegatives += 1;
      }
      if (result.auditorFlagged) {
        existing.auditorFlags += 1;
      }
      criterionSummary.set(criterion, existing);
    }

    report.push({
      caseId: spikeCase.id,
      label: spikeCase.label,
      questionCode: spikeCase.questionCode,
      tags: spikeCase.tags ?? [],
      expectedScoreFloor: spikeCase.expectedScoreFloor ?? null,
      expectedScoreCeiling: spikeCase.expectedScoreCeiling ?? null,
      primary: {
        score: primary.evaluation.finalContentScoreAfterCaps,
        missingComponents: primary.evaluation.missingComponents,
        criterionAssessment: primary.evaluation.criterionAssessment,
        headline: primary.feedback.headline,
      },
      audit: {
        ...parsedAudit,
        latencyMs: Date.now() - auditStartedAt,
      },
      comparisons,
    });
  }

  const summary = buildSummary(scoreModelSpikeCases.length, inflatedScoreCount, deflatedScoreCount, criterionSummary);
  printSummary(summary);
  await writeReport({ generatedAt: new Date().toISOString(), auditPromptVersion: EVALUATOR_AUDIT_PROMPT_VERSION, summary, report });
}

function compareAgainstExpectations(
  spikeCase: ScoreModelSpikeCase,
  evaluation: ReturnType<typeof evaluateAnswerHeuristically>["evaluation"],
  audit: z.infer<typeof auditSchema>,
) {
  const criterionChecks = Object.fromEntries(
    criteria.map((criterion) => {
      const expected = spikeCase.expectedCriteria?.[criterion];
      const actual = evaluation.criterionAssessment[criterion].status;
      const auditor = audit.criterionAudit[criterion];
      return [
        criterion,
        {
          expected: expected ?? null,
          actual,
          auditorStatus: auditor.status,
          falsePositive: Boolean(expected && expected !== "covered" && actual === "covered"),
          falseNegative: Boolean(expected === "covered" && actual !== "covered"),
          auditorFlagged:
            actual === "covered" &&
            (auditor.overMarkedRisk || auditor.status !== "covered"),
        },
      ];
    }),
  ) as Record<
    CriterionKey,
    {
      expected: NonNullable<ScoreModelSpikeCase["expectedCriteria"]>[CriterionKey] | null;
      actual: ReturnType<typeof evaluateAnswerHeuristically>["evaluation"]["criterionAssessment"][CriterionKey]["status"];
      auditorStatus: z.infer<typeof auditSchema>["criterionAudit"][CriterionKey]["status"];
      falsePositive: boolean;
      falseNegative: boolean;
      auditorFlagged: boolean;
    }
  >;

  return {
    inflatedScore:
      spikeCase.expectedScoreCeiling != null &&
      evaluation.finalContentScoreAfterCaps > spikeCase.expectedScoreCeiling,
    deflatedScore:
      spikeCase.expectedScoreFloor != null &&
      evaluation.finalContentScoreAfterCaps < spikeCase.expectedScoreFloor,
    auditorInflationRisk:
      evaluation.finalContentScoreAfterCaps > audit.scoreCeiling || audit.inflationRisk !== "low",
    criterionChecks,
  };
}

function buildSummary(
  totalCases: number,
  inflatedScoreCount: number,
  deflatedScoreCount: number,
  criterionSummary: Map<string, { expectedChecks: number; auditorChecks: number; falsePositives: number; falseNegatives: number; auditorFlags: number }>,
) {
  const criterionRates = Object.fromEntries(
    Array.from(criterionSummary.entries()).map(([criterion, stats]) => {
      const expectedDenominator = Math.max(1, stats.expectedChecks);
      const auditorDenominator = Math.max(1, stats.auditorChecks);
      return [
        criterion,
        {
          falsePositiveRate:
            stats.expectedChecks === 0 ? 0 : stats.falsePositives / expectedDenominator,
          falseNegativeRate:
            stats.expectedChecks === 0 ? 0 : stats.falseNegatives / expectedDenominator,
          auditorFlagRate: stats.auditorFlags / auditorDenominator,
          ...stats,
        },
      ];
    }),
  );

  return {
    totalCases,
    inflatedScoreCount,
    deflatedScoreCount,
    criterionRates,
  };
}

function printSummary(summary: ReturnType<typeof buildSummary>) {
  console.log("");
  console.log(`Audited ${summary.totalCases} calibration cases.`);
  console.log(`Inflated scores: ${summary.inflatedScoreCount}`);
  console.log(`Deflated scores: ${summary.deflatedScoreCount}`);
  console.log("");
  console.log("Criterion drift:");
  for (const [criterion, stats] of Object.entries(summary.criterionRates)) {
    console.log(
      `  ${criterion}: false positive ${toPercent(stats.falsePositiveRate)}, false negative ${toPercent(stats.falseNegativeRate)}, auditor flags ${toPercent(stats.auditorFlagRate)}`,
    );
  }
}

async function writeReport(report: unknown) {
  const outputDir = resolve(process.cwd(), "tmp");
  const outputPath = resolve(outputDir, "score-calibration-audit-report.json");
  await mkdir(outputDir, { recursive: true });
  await writeFile(outputPath, JSON.stringify(report, null, 2));
  console.log("");
  console.log(`Saved JSON report to ${outputPath}`);
}

function toPercent(value: number) {
  return `${Math.round(value * 1000) / 10}%`;
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
