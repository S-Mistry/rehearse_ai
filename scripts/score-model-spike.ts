import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadEnvConfig } from "@next/env";
import { questionBank } from "../src/lib/rehearse/questions/question-bank";
import {
  type EvaluationModelName,
  evaluateAnswerWithModel,
} from "../src/lib/rehearse/services/rehearse-service";
import {
  applySpikeCaseDefaults,
  scoreModelSpikeCases,
} from "./fixtures/score-model-spike";

const models = (process.env.SPIKE_MODELS?.split(",").map((value) => value.trim()).filter(Boolean) ??
  ["gpt-4.1", "gpt-5-mini"]) as EvaluationModelName[];

async function main() {
  loadEnvConfig(process.cwd());

  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is required to run this spike.");
    process.exitCode = 1;
    return;
  }

  const report = [];

  for (const spikeCase of scoreModelSpikeCases) {
    const question = questionBank.find((item) => item.code === spikeCase.questionCode);
    if (!question) {
      throw new Error(`Question ${spikeCase.questionCode} not found.`);
    }

    const input = applySpikeCaseDefaults(spikeCase, question);
    const runs = [];

    for (const model of models) {
      const startedAt = Date.now();
      const result = await evaluateAnswerWithModel(input, model);
      if (!result) {
        throw new Error(`Model ${model} did not return a structured result.`);
      }

      runs.push({
        model,
        latencyMs: Date.now() - startedAt,
        usage: result.usage,
        evaluation: result.evaluation,
        feedback: result.feedback,
      });
    }

    report.push({
      caseId: spikeCase.id,
      label: spikeCase.label,
      questionCode: spikeCase.questionCode,
      seniorityLevel: spikeCase.seniorityLevel,
      runs,
    });
  }

  printSummary(report);
  await writeReport(report);
}

function printSummary(
  report: Array<{
    caseId: string;
    label: string;
    questionCode: string;
    seniorityLevel: string;
    runs: Array<{
      model: string;
      latencyMs: number;
      usage: {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
      } | null;
      evaluation: {
        contentScoreRaw: number;
        finalContentScoreAfterCaps: number;
        deliveryScore: number;
        missingComponents: string[];
        strengths: string[];
        capsApplied: string[];
      };
      feedback: {
        headline: string;
        retryPrompt: string;
      };
    }>;
  }>,
) {
  for (const entry of report) {
    console.log("");
    console.log(`Case: ${entry.label} (${entry.questionCode}, ${entry.seniorityLevel})`);
    for (const run of entry.runs) {
      console.log(`  ${run.model}`);
      console.log(
        `    scores: raw ${run.evaluation.contentScoreRaw}, capped ${run.evaluation.finalContentScoreAfterCaps}, delivery ${run.evaluation.deliveryScore}`,
      );
      console.log(
        `    missing: ${run.evaluation.missingComponents.length > 0 ? run.evaluation.missingComponents.join(", ") : "none"}`,
      );
      console.log(
        `    strengths: ${run.evaluation.strengths.length > 0 ? run.evaluation.strengths.join(", ") : "none"}`,
      );
      console.log(
        `    caps: ${run.evaluation.capsApplied.length > 0 ? run.evaluation.capsApplied.join(", ") : "none"}`,
      );
      console.log(`    headline: ${run.feedback.headline}`);
      console.log(`    retry: ${run.feedback.retryPrompt}`);
      console.log(
        `    usage: ${
          run.usage
            ? `${run.usage.inputTokens} in / ${run.usage.outputTokens} out / ${run.usage.totalTokens} total`
            : "unavailable"
        }, latency ${run.latencyMs} ms`,
      );
    }
    if (entry.runs.length === 2) {
      const [left, right] = entry.runs;
      console.log(
        `  delta (${right.model} - ${left.model}): capped ${
          right.evaluation.finalContentScoreAfterCaps - left.evaluation.finalContentScoreAfterCaps
        }, delivery ${right.evaluation.deliveryScore - left.evaluation.deliveryScore}`,
      );
    }
  }
}

async function writeReport(report: unknown) {
  const outputDir = resolve(process.cwd(), "tmp");
  const outputPath = resolve(outputDir, "score-model-spike-report.json");
  await mkdir(outputDir, { recursive: true });
  await writeFile(outputPath, JSON.stringify(report, null, 2));
  console.log("");
  console.log(`Saved JSON report to ${outputPath}`);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
