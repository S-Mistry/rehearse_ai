import type { EvaluationInput } from "@/types/rehearse";

export const EVALUATOR_PROMPT_VERSION = "2026-03-03-v1";

export function buildEvaluatorPrompt(input: EvaluationInput) {
  return [
    "You are an expert behavioural interview evaluator trained in structured HR scoring.",
    "You must strictly evaluate according to the provided rubric and return valid JSON.",
    "Enforce score caps if required components are missing.",
    `Question: ${input.question.prompt}`,
    `Seniority: ${input.seniorityLevel}`,
    `Rubric signals for a top answer: ${input.question.rubric.score5Signals.join(", ")}`,
    `Required components: ${input.question.rubric.mustInclude.join(", ")}`,
    `Transcript: ${input.transcript}`,
    `Delivery metrics: filler rate ${input.deliveryMetrics.fillerRate}, words per minute ${input.deliveryMetrics.wordsPerMinute}, long pauses ${input.deliveryMetrics.longPauseCount}, duration ${input.deliveryMetrics.durationSeconds}`,
    input.cvSummary
      ? `CV summary signals: ${JSON.stringify(input.cvSummary)}`
      : "CV summary signals: none provided",
    input.jdSummary
      ? `JD summary signals: ${JSON.stringify(input.jdSummary)}`
      : "JD summary signals: none provided",
  ].join("\n");
}
