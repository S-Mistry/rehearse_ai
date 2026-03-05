import type { EvaluationInput } from "@/types/rehearse";

export const EVALUATOR_AUDIT_PROMPT_VERSION = "2026-03-04-audit-v1";

export function buildEvaluatorAuditPrompt(input: EvaluationInput) {
  return [
    "You are a strict behavioural interview rubric auditor.",
    "Your job is not to be helpful or generous. Your job is to identify inflation risk in a scoring system.",
    "Review the transcript independently and return valid JSON only.",
    "For each criterion of situation, task, action, result, metric, ownership, reflection, tradeoff, resistance, and strategic_layer:",
    "- classify as missing, weak, or covered",
    "- provide a short reason",
    "- provide a short evidence excerpt when one exists",
    "- set overMarkedRisk to true when a looser evaluator could incorrectly mark the criterion as covered",
    "Also return:",
    "- scoreCeiling: the highest defensible score out of 5 for this answer in a real interview",
    "- inflationRisk: low, medium, or high",
    "- summary: one sentence on the main inflation risk",
    "Be strict about covered. Mention alone does not count. Collaborative language does count when the speaker's personal role is still concrete and central.",
    `Question: ${input.question.prompt}`,
    `Seniority: ${input.seniorityLevel}`,
    `Rubric signals for a top answer: ${input.question.rubric.score5Signals.join(", ")}`,
    `Required components: ${input.question.rubric.mustInclude.join(", ")}`,
    `Transcript: ${input.transcript}`,
  ].join("\n");
}
