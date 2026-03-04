import type {
  ConversationTurn,
  EvaluationResult,
  JdProfileStructured,
  MissingComponent,
  QuestionBankItem,
  SessionBundle,
  StarSection,
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

type FollowUpPriority =
  | { kind: "star"; value: StarSection }
  | { kind: "missing"; value: MissingComponent };

const followUpPriority: FollowUpPriority[] = [
  { kind: "star", value: "result" },
  { kind: "star", value: "action" },
  { kind: "star", value: "situation" },
  { kind: "star", value: "task" },
  { kind: "missing", value: "metric" },
  { kind: "missing", value: "ownership" },
  { kind: "missing", value: "tradeoff" },
  { kind: "missing", value: "reflection" },
  { kind: "missing", value: "resistance" },
  { kind: "missing", value: "strategic_layer" },
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
  const weakSections = getWeakStarSections(evaluation);
  const hasMissingStarSection = getMissingStarSections(evaluation).length > 0;
  return (
    evaluation.finalContentScoreAfterCaps <= 3 &&
    (hasMissingStarSection ||
      weakSections.length >= 2 ||
      evaluation.starAssessment.result.status === "weak" ||
      evaluation.missingComponents.length > 0)
  );
}

export function buildFollowUpQuestion(
  question: QuestionBankItem,
  evaluation: EvaluationResult,
) {
  const missingStar = getMissingStarSections(evaluation);
  const weakStar = getWeakStarSections(evaluation);
  const focus = followUpPriority.find((entry) => {
    if (entry.kind === "star") {
      if (missingStar.includes(entry.value)) {
        return true;
      }
      if (entry.value === "result" && weakStar.includes(entry.value)) {
        return true;
      }
      if (entry.value === "action" && weakStar.includes(entry.value)) {
        return true;
      }
      if ((entry.value === "situation" || entry.value === "task") && weakStar.includes(entry.value)) {
        return true;
      }
      return false;
    }

    return evaluation.missingComponents.includes(entry.value);
  });

  if (!focus) {
    return null;
  }

  const target = focus.value;
  const prompt = followUpPrompts[target];
  if (question.code === "Q10" && target === "metric") {
    return "What specific evidence should convince me that you would be strong in this role?";
  }

  return prompt;
}

function getMissingStarSections(evaluation: EvaluationResult) {
  if (!evaluation.starAssessment) {
    return (["situation", "task", "action", "result"] as StarSection[]).filter((section) =>
      evaluation.missingComponents.includes(section),
    );
  }

  return (Object.entries(evaluation.starAssessment) as Array<
    [StarSection, EvaluationResult["starAssessment"][StarSection]]
  >)
    .filter(([, section]) => section.status === "missing")
    .map(([section]) => section);
}

function getWeakStarSections(evaluation: EvaluationResult) {
  if (!evaluation.starAssessment) {
    return [];
  }

  return (Object.entries(evaluation.starAssessment) as Array<
    [StarSection, EvaluationResult["starAssessment"][StarSection]]
  >)
    .filter(([, section]) => section.status === "weak")
    .map(([section]) => section);
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
