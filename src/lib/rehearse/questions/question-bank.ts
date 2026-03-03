import type {
  QuestionBankItem,
  QuestionCode,
  SeniorityLevel,
} from "@/types/rehearse";

export const seniorityConfig: Record<
  SeniorityLevel,
  { label: string; multiplier: number; scopeHint: string }
> = {
  early_career: {
    label: "Early Career",
    multiplier: 0.9,
    scopeHint: "Clear ownership and learning matter more than org-wide scope.",
  },
  mid_ic: {
    label: "Mid / IC",
    multiplier: 1.0,
    scopeHint: "Show dependable execution, metrics, and decision logic.",
  },
  senior: {
    label: "Senior",
    multiplier: 1.2,
    scopeHint: "Show trade-offs, ambiguity handling, and cross-functional scope.",
  },
  lead_principal: {
    label: "Lead / Principal",
    multiplier: 1.3,
    scopeHint: "Show systems thinking, influence, and durable improvements.",
  },
  manager_director: {
    label: "Manager / Director",
    multiplier: 1.5,
    scopeHint: "Show strategic framing, stakeholder complexity, and org impact.",
  },
};

export const questionBank: QuestionBankItem[] = [
  {
    id: "question_q1",
    code: "Q1",
    order: 1,
    title: "Led a challenging project",
    category: "Leadership",
    prompt: "Tell me about a time you led a challenging project.",
    rubricVersion: "2026-03-03-v1",
    rubric: {
      score5Signals: [
        "clear scope",
        "measurable success metric",
        "cross-functional alignment",
        "resource constraint navigation",
        "explicit trade-offs",
        "post-project learning",
      ],
      mustInclude: [
        "situation",
        "task",
        "action",
        "result",
        "metric",
        "ownership",
        "tradeoff",
        "reflection",
      ],
      senioritySensitive: true,
    },
  },
  {
    id: "question_q2",
    code: "Q2",
    order: 2,
    title: "Resolved conflict",
    category: "Conflict Resolution",
    prompt: "Describe a time you dealt with conflict.",
    rubricVersion: "2026-03-03-v1",
    rubric: {
      score5Signals: [
        "clear conflict type",
        "active listening",
        "structured resolution",
        "measurable or relational outcome",
        "relationship preserved",
        "reflection on emotional intelligence",
      ],
      mustInclude: [
        "situation",
        "action",
        "result",
        "ownership",
        "reflection",
        "resistance",
      ],
      resistanceRequired: true,
    },
  },
  {
    id: "question_q3",
    code: "Q3",
    order: 3,
    title: "Handled failure",
    category: "Ownership",
    prompt: "Tell me about a failure.",
    rubricVersion: "2026-03-03-v1",
    rubric: {
      score5Signals: [
        "full ownership",
        "clear decision error",
        "root cause analysis",
        "corrective action",
        "preventative system change",
        "quantifiable recovery impact",
      ],
      mustInclude: [
        "situation",
        "action",
        "result",
        "ownership",
        "reflection",
      ],
    },
  },
  {
    id: "question_q4",
    code: "Q4",
    order: 4,
    title: "Influenced without authority",
    category: "Influence",
    prompt: "Tell me about a time you influenced without authority.",
    rubricVersion: "2026-03-03-v1",
    rubric: {
      score5Signals: [
        "stakeholder mapping",
        "objection handling",
        "framing strategy",
        "political awareness",
        "outcome metric",
      ],
      mustInclude: [
        "situation",
        "action",
        "result",
        "ownership",
        "metric",
        "resistance",
      ],
      resistanceRequired: true,
      senioritySensitive: true,
    },
  },
  {
    id: "question_q5",
    code: "Q5",
    order: 5,
    title: "Made a data-driven decision",
    category: "Decision Making",
    prompt: "Tell me about a time you made a data-driven decision.",
    rubricVersion: "2026-03-03-v1",
    rubric: {
      score5Signals: [
        "baseline state",
        "hypothesis",
        "data sources",
        "decision criteria",
        "outcome vs counterfactual",
      ],
      mustInclude: ["situation", "action", "result", "metric", "ownership"],
    },
  },
  {
    id: "question_q6",
    code: "Q6",
    order: 6,
    title: "Worked through ambiguity",
    category: "Ambiguity",
    prompt: "Tell me about a time you worked under ambiguity.",
    rubricVersion: "2026-03-03-v1",
    rubric: {
      score5Signals: [
        "problem framing",
        "assumption identification",
        "iteration",
        "risk mitigation",
        "clear outcome",
      ],
      mustInclude: [
        "situation",
        "action",
        "result",
        "ownership",
        "tradeoff",
      ],
      senioritySensitive: true,
    },
  },
  {
    id: "question_q7",
    code: "Q7",
    order: 7,
    title: "Improved a process",
    category: "Operational Excellence",
    prompt: "Tell me about a time you improved a process.",
    rubricVersion: "2026-03-03-v1",
    rubric: {
      score5Signals: [
        "bottleneck diagnosis",
        "quantified inefficiency",
        "implemented change",
        "before-and-after metrics",
        "scalability impact",
      ],
      mustInclude: ["situation", "action", "result", "metric", "ownership"],
    },
  },
  {
    id: "question_q8",
    code: "Q8",
    order: 8,
    title: "Handled competing priorities",
    category: "Prioritization",
    prompt: "Tell me about a time you handled multiple priorities.",
    rubricVersion: "2026-03-03-v1",
    rubric: {
      score5Signals: [
        "prioritization framework",
        "trade-offs",
        "delegation clarity",
        "outcome integrity",
      ],
      mustInclude: [
        "situation",
        "action",
        "result",
        "ownership",
        "tradeoff",
      ],
      senioritySensitive: true,
    },
  },
  {
    id: "question_q9",
    code: "Q9",
    order: 9,
    title: "Delivered difficult feedback",
    category: "Coaching",
    prompt: "Tell me about a time you gave difficult feedback.",
    rubricVersion: "2026-03-03-v1",
    rubric: {
      score5Signals: [
        "framing strategy",
        "empathy markers",
        "behavioral specificity",
        "outcome change",
        "relationship maintained",
      ],
      mustInclude: [
        "situation",
        "action",
        "result",
        "ownership",
        "reflection",
      ],
    },
  },
  {
    id: "question_q10",
    code: "Q10",
    order: 10,
    title: "Why should we hire you",
    category: "Positioning",
    prompt: "Why should we hire you?",
    rubricVersion: "2026-03-03-v1",
    rubric: {
      score5Signals: [
        "value proposition",
        "direct JD alignment",
        "quantified strengths",
        "competitive differentiation",
        "future contribution framing",
      ],
      mustInclude: [
        "action",
        "result",
        "metric",
        "ownership",
        "strategic_layer",
      ],
      senioritySensitive: true,
    },
  },
];

export const questionOrder: QuestionCode[] = questionBank
  .sort((left, right) => left.order - right.order)
  .map((question) => question.code);

export function getQuestionByCode(code: QuestionCode) {
  return questionBank.find((question) => question.code === code);
}
