import type { MissingComponent, QuestionBankItem } from "@/types/rehearse";

const nudgeLibrary: Record<MissingComponent, string> = {
  result: "the measurable result and what changed because of your work",
  ownership: "the decision or action that was specifically yours",
  metric: "a concrete metric or before-and-after indicator",
  situation: "the setup and the context that made the challenge real",
  task: "the responsibility you personally needed to carry",
  action: "the actions you took, step by step",
  reflection: "what you learned and how it changed your approach",
  tradeoff: "the trade-off you had to navigate and why you chose that path",
  resistance: "the pushback or resistance you had to work through",
  strategic_layer: "the broader business or team impact beyond the immediate task",
};

const nudgePriority: MissingComponent[] = [
  "result",
  "ownership",
  "metric",
  "situation",
  "task",
  "action",
  "reflection",
  "tradeoff",
  "resistance",
  "strategic_layer",
];

export function choosePrimaryNudge(missing: MissingComponent[]) {
  return nudgePriority.find((item) => missing.includes(item)) ?? "result";
}

export function buildNudge(
  question: QuestionBankItem,
  strengths: string[],
  missing: MissingComponent[],
) {
  const focus = choosePrimaryNudge(missing);
  const lead = strengths[0] ?? `Your framing for ${question.category.toLowerCase()} is clear`;
  return `You explained ${lead.toLowerCase()} clearly. Clarify ${nudgeLibrary[focus]}.`;
}
