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
type CriterionStats = {
  expectedChecks: number;
  auditorChecks: number;
  falsePositives: number;
  falseNegatives: number;
  auditorFlags: number;
};

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
  const criterionSummary = new Map<string, CriterionStats>();
  const requiredCriterionSummary = new Map<string, CriterionStats>();
  const optionalCriterionSummary = new Map<string, CriterionStats>();
  let inflatedScoreCount = 0;
  let deflatedScoreCount = 0;

  for (const spikeCase of scoreModelSpikeCases) {
    const question = questionBank.find((item) => item.code === spikeCase.questionCode);
    if (!question) {
      throw new Error(`Question ${spikeCase.questionCode} not found.`);
    }

    const requiredCriteria = new Set(question.rubric.mustInclude);
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

    const comparisons = compareAgainstExpectations(
      spikeCase,
      primary.evaluation,
      parsedAudit,
      requiredCriteria,
    );
    inflatedScoreCount += comparisons.inflatedScore ? 1 : 0;
    deflatedScoreCount += comparisons.deflatedScore ? 1 : 0;

    for (const criterion of criteria) {
      const existing =
        criterionSummary.get(criterion) ?? emptyStats();
      const requiredExisting =
        requiredCriterionSummary.get(criterion) ?? emptyStats();
      const optionalExisting =
        optionalCriterionSummary.get(criterion) ?? emptyStats();
      const result = comparisons.criterionChecks[criterion];
      applyStats(existing, result);
      criterionSummary.set(criterion, existing);
      if (result.isRequired) {
        applyStats(requiredExisting, result);
        requiredCriterionSummary.set(criterion, requiredExisting);
      } else {
        applyStats(optionalExisting, result);
        optionalCriterionSummary.set(criterion, optionalExisting);
      }
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

  const summary = buildSummary(
    scoreModelSpikeCases.length,
    inflatedScoreCount,
    deflatedScoreCount,
    criterionSummary,
    requiredCriterionSummary,
    optionalCriterionSummary,
  );
  printSummary(summary);
  await writeReport({ generatedAt: new Date().toISOString(), auditPromptVersion: EVALUATOR_AUDIT_PROMPT_VERSION, summary, report });
}

function compareAgainstExpectations(
  spikeCase: ScoreModelSpikeCase,
  evaluation: ReturnType<typeof evaluateAnswerHeuristically>["evaluation"],
  audit: z.infer<typeof auditSchema>,
  requiredCriteria: Set<string>,
) {
  const criterionChecks = Object.fromEntries(
    criteria.map((criterion) => {
      const expected = spikeCase.expectedCriteria?.[criterion];
      const actual = evaluation.criterionAssessment[criterion].status;
      const auditor = audit.criterionAudit[criterion];
      const isRequired = requiredCriteria.has(criterion);
      return [
        criterion,
        {
          isRequired,
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
      isRequired: boolean;
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
  criterionSummary: Map<string, CriterionStats>,
  requiredCriterionSummary: Map<string, CriterionStats>,
  optionalCriterionSummary: Map<string, CriterionStats>,
) {
  const criterionRates = toRateSummary(criterionSummary);
  const requiredCriterionRates = toRateSummary(requiredCriterionSummary);
  const optionalCriterionRates = toRateSummary(optionalCriterionSummary);
  const requiredGate = aggregateGate(requiredCriterionRates);

  return {
    totalCases,
    inflatedScoreCount,
    deflatedScoreCount,
    criterionRates,
    requiredCriterionRates,
    optionalCriterionRates,
    requiredGate,
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
  console.log("");
  console.log("Required-criterion drift (go/no-go signal):");
  for (const [criterion, stats] of Object.entries(summary.requiredCriterionRates)) {
    console.log(
      `  ${criterion}: false positive ${toPercent(stats.falsePositiveRate)}, false negative ${toPercent(stats.falseNegativeRate)}, auditor flags ${toPercent(stats.auditorFlagRate)}`,
    );
  }
  console.log("");
  console.log(
    `Required gate totals: false positives ${summary.requiredGate.falsePositives}, false negatives ${summary.requiredGate.falseNegatives}, auditor flags ${summary.requiredGate.auditorFlags}`,
  );
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

function emptyStats(): CriterionStats {
  return {
    expectedChecks: 0,
    auditorChecks: 0,
    falsePositives: 0,
    falseNegatives: 0,
    auditorFlags: 0,
  };
}

function applyStats(
  stats: CriterionStats,
  result: {
    expected: unknown;
    falsePositive: boolean;
    falseNegative: boolean;
    auditorFlagged: boolean;
  },
) {
  stats.auditorChecks += 1;
  if (result.expected) {
    stats.expectedChecks += 1;
  }
  if (result.falsePositive) {
    stats.falsePositives += 1;
  }
  if (result.falseNegative) {
    stats.falseNegatives += 1;
  }
  if (result.auditorFlagged) {
    stats.auditorFlags += 1;
  }
}

function toRateSummary(summary: Map<string, CriterionStats>) {
  return Object.fromEntries(
    Array.from(summary.entries()).map(([criterion, stats]) => {
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
  ) as Record<
    string,
    CriterionStats & { falsePositiveRate: number; falseNegativeRate: number; auditorFlagRate: number }
  >;
}

function aggregateGate(
  rates: Record<string, { falsePositives: number; falseNegatives: number; auditorFlags: number }>,
) {
  return Object.values(rates).reduce(
    (accumulator, item) => {
      accumulator.falsePositives += item.falsePositives;
      accumulator.falseNegatives += item.falseNegatives;
      accumulator.auditorFlags += item.auditorFlags;
      return accumulator;
    },
    { falsePositives: 0, falseNegatives: 0, auditorFlags: 0 },
  );
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
