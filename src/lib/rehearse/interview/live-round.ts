import type {
  ConversationTurn,
  EvaluationResult,
  JdProfileStructured,
  MissingComponent,
  QuestionBankItem,
  SessionBundle,
} from "@/types/rehearse";
import { buildInterviewerIntro } from "@/lib/rehearse/interview/interviewer-persona";

const followUpPrompts: Record<MissingComponent, string> = {
  situation: "Before we move on, what was the situation and why was it challenging?",
  task: "What were you personally responsible for in that situation?",
  action: "Walk me through the specific actions you took.",
  result: "What changed because of your work, and how did you know it worked?",
  metric: "Can you quantify the outcome with a metric or a before-and-after?",
  ownership: "What part of that outcome was specifically yours?",
  reflection: "What did you learn, and what would you do differently next time?",
  tradeoff: "What trade-off did you have to make, and why did you choose that path?",
  resistance: "What pushback or resistance did you have to work through?",
  strategic_layer: "How did this affect the wider team, customer, or business?",
};

const followUpPriority: MissingComponent[] = [
  "result",
  "metric",
  "ownership",
  "action",
  "situation",
  "task",
  "tradeoff",
  "reflection",
  "resistance",
  "strategic_layer",
];

export function inferRoleTitleFromJd(rawText?: string | null) {
  const source = rawText?.trim();
  if (!source) {
    return null;
  }

  const titleMatch = source.match(
    /(?:job title|title|role)\s*[:\-]\s*([^\n]{3,80})/i,
  );
  if (titleMatch?.[1]) {
    return cleanRoleTitle(titleMatch[1]);
  }

  const titleLikeLine = source
    .split("\n")
    .map((line) => line.trim())
    .find((line) => isLikelyRoleTitle(line));

  return titleLikeLine ? cleanRoleTitle(titleLikeLine) : null;
}

export function inferCompanyNameFromJd(rawText?: string | null) {
  const source = rawText?.trim();
  if (!source) {
    return null;
  }

  const companyMatch = source.match(
    /(?:company|company name|organisation|organization)\s*[:\-]\s*([^\n]{2,80})/i,
  );
  if (companyMatch?.[1]) {
    const companyName = companyMatch[1].trim();
    return companyName.length <= 60 ? companyName : null;
  }

  return null;
}

export function resolveInterviewContext(bundle: SessionBundle) {
  const rawJd = bundle.jdProfile?.rawText ?? null;
  return {
    roleTitle:
      bundle.session.targetRoleTitle ||
      inferRoleTitleFromJd(rawJd) ||
      inferRoleTitleFromStructuredJd(bundle.jdProfile?.structuredJson as JdProfileStructured | null) ||
      "this role",
    companyName:
      bundle.session.targetCompanyName || inferCompanyNameFromJd(rawJd) || null,
  };
}

export function buildInterviewIntro(_bundle: SessionBundle, question: QuestionBankItem) {
  return buildInterviewerIntro(question);
}

export function combineCandidateTranscript(turns: ConversationTurn[]) {
  return turns
    .filter((turn) => turn.speaker === "candidate")
    .map((turn) => turn.text.trim())
    .filter(Boolean)
    .join(" ");
}

export function shouldAskFollowUp(evaluation: EvaluationResult) {
  return evaluation.finalContentScoreAfterCaps <= 3 && evaluation.missingComponents.length > 0;
}

export function buildFollowUpQuestion(
  question: QuestionBankItem,
  evaluation: EvaluationResult,
) {
  const focus =
    followUpPriority.find((component) =>
      evaluation.missingComponents.includes(component),
    ) ?? evaluation.missingComponents[0];

  if (!focus) {
    return null;
  }

  const prompt = followUpPrompts[focus];
  if (question.code === "Q10" && focus === "metric") {
    return "What specific evidence should convince me that you would be strong in this role?";
  }

  return prompt;
}

function cleanRoleTitle(value: string) {
  return value.replace(/\s+/g, " ").replace(/^[\-\s]+|[\-\s]+$/g, "");
}

function isLikelyRoleTitle(value: string) {
  if (!value || value.length < 4 || value.length > 80) {
    return false;
  }

  if (value.endsWith(".") || value.includes(":")) {
    return false;
  }

  const normalized = cleanRoleTitle(value).toLowerCase();
  if (
    [
      "about the job",
      "about the role",
      "about zego",
      "our product teams",
      "our toolkit",
      "what you will be doing",
      "what you will need to be successful",
      "what's it like to work at zego?",
      "whats it like to work at zego?",
    ].includes(normalized)
  ) {
    return false;
  }

  return /(manager|director|lead|head|principal|engineer|designer|analyst|product|growth|operations|marketing|sales|executive|officer|specialist)/i.test(
    value,
  );
}

function inferRoleTitleFromStructuredJd(jd: JdProfileStructured | null) {
  if (!jd) {
    return null;
  }

  const lead = jd.coreCompetencies[0];
  if (!lead) {
    return null;
  }

  return `${lead} role`;
}
