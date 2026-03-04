import type { EvaluationInput } from "@/types/rehearse";

export const EVALUATOR_PROMPT_VERSION = "2026-03-04-v2";

export function buildEvaluatorPrompt(input: EvaluationInput) {
  return [
    "You are an expert behavioural interview evaluator trained in structured HR scoring.",
    "You must strictly evaluate according to the provided rubric and return valid JSON.",
    "Enforce score caps if required components are missing.",
    "For STAR coverage, classify each of situation, task, action, and result as missing, weak, or covered.",
    "Use covered only when the section is concrete enough to be acceptable in a real interview answer. Vague mention does not count as covered.",
    "For each STAR section, provide a one-sentence reason and a short evidence excerpt from the transcript when one exists.",
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
