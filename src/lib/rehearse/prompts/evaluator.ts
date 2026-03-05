import type { EvaluationInput } from "@/types/rehearse";

export const EVALUATOR_PROMPT_VERSION = "2026-03-04-v3";

export function buildEvaluatorPrompt(input: EvaluationInput) {
  return [
    "You are an expert behavioural interview evaluator trained in structured HR scoring.",
    "You must strictly evaluate according to the provided rubric and return valid JSON.",
    "Use criterion assessment as the primary truth. For each of situation, task, action, result, metric, ownership, reflection, tradeoff, resistance, and strategic_layer classify the answer as missing, weak, or covered.",
    "Use covered only when the criterion is specific, credible, and interview-strong enough to satisfy the rubric in a real hiring conversation. Mention alone does not count.",
    "Weak means the criterion is present in some form but still too generic, vague, or unsupported to release a score cap.",
    "For each criterion, provide a one-sentence reason, a short evidence excerpt from the transcript when one exists, and an optional strictness note when the requirement is easy to over-mark.",
    "Also return starAssessment for situation, task, action, and result, aligned with the corresponding criterionAssessment statuses.",
    "Do not inflate scores because of polished language. If a required criterion is only weak, treat it as unresolved for top-band scoring.",
    "Assess role relevance advisory-only. Use direct_match when the example clearly maps to the role, transferable when the example is relevant but needs an explicit bridge, weak_match when the example feels too far away, and not_enough_context when role context is missing.",
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
