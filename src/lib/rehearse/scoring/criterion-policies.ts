import type { MissingComponent, QuestionCode } from "@/types/rehearse";

export interface CriterionPolicyDefinition {
  covered: RegExp[];
  weak?: RegExp[];
  falsePositive?: RegExp[];
  strictnessNote?: string;
  capReleasingOnlyWhenCovered?: boolean;
}

type CriterionPolicyRegistry = Partial<
  Record<QuestionCode, Partial<Record<MissingComponent, CriterionPolicyDefinition>>>
>;

export const criterionPolicyRegistry: CriterionPolicyRegistry = {
  Q1: {
    task: {
      covered: [
        /\bi founded\b/,
        /\bi launched\b/,
        /\bi led discovery\b/,
        /\bi turned (this|that) into\b/,
        /\bi created the mvp\b/,
        /\bi ran the pilot\b/,
      ],
      weak: [/\bi was part of\b/, /\bi helped\b/],
      strictnessNote:
        "Founder or creator language can satisfy task only when it clearly establishes personal remit and scope.",
      capReleasingOnlyWhenCovered: true,
    },
    tradeoff: {
      covered: [
        /\binstead of\b/,
        /\brather than\b/,
        /\bdefer(red)?\b/,
        /\bcut\b.{0,40}\bto protect\b/,
        /\bprioriti[sz]ed\b.{0,80}\bbecause\b/,
      ],
      falsePositive: [/\bdecided to\b/, /\bchose to\b/],
      strictnessNote:
        "Trade-off is only covered when the answer names the alternative path and why it was not chosen.",
      capReleasingOnlyWhenCovered: true,
    },
  },
  Q2: {
    ownership: {
      covered: [
        /\bi was managing\b/,
        /\bi met with\b/,
        /\bi worked through\b/,
        /\bi scoped\b/,
        /\bi proposed\b/,
        /\bi set up\b/,
      ],
      weak: [/\bwe decided\b/, /\bwe discussed\b/],
      strictnessNote:
        "Team language is acceptable when it is anchored by a clear first-person leadership or decision-making action.",
      capReleasingOnlyWhenCovered: true,
    },
    action: {
      covered: [
        /\bmet with\b/,
        /\bdiscussed\b/,
        /\bworked through\b/,
        /\bset up\b/,
        /\bcreated\b/,
        /\bbrought in\b/,
        /\bchanged the process\b/,
      ],
      weak: [/\bwe decided\b/, /\bwe agreed\b/],
      strictnessNote:
        "Collaborative phrasing still counts when the speaker has already established personal ownership and the process change is concrete.",
    },
    resistance: {
      covered: [
        /\bworkload increased\b/,
        /\badjacent team\b/,
        /\btighter turnaround\b/,
        /\boperational burden\b/,
        /\bdownstream pain\b/,
        /\bmore pitches\b/,
        /\bissue was that\b/,
        /\bchallenge(s)? for\b/,
      ],
      strictnessNote:
        "Implicit stakeholder strain and downstream operational pain count as resistance when they create real friction to resolve.",
    },
  },
  Q4: {
    resistance: {
      covered: [
        /\bthey thought\b/,
        /\bthey disagreed\b/,
        /\bobjection\b/,
        /\bconcern\b/,
        /\bslow them down\b/,
        /\bpolitical\b/,
      ],
      strictnessNote:
        "Influence answers should count resistance when they show a credible opposing concern, not just the word pushback.",
    },
  },
  Q10: {
    strategic_layer: {
      covered: [
        /\bexecutive(s)?\b/,
        /\bbusiness impact\b/,
        /\boperating view\b/,
        /\bplanning\b/,
        /\borg design\b/,
      ],
      strictnessNote:
        "Role-fit answers need broader business or organisational consequence, not just a personal capability claim.",
    },
    tradeoff: {
      covered: [/\binstead of\b/, /\bprioriti[sz]ed\b.{0,80}\bbecause\b/, /\brather than\b/],
      strictnessNote:
        "Role-fit trade-offs only count when they show decision criteria and strategic prioritisation.",
      capReleasingOnlyWhenCovered: true,
    },
  },
};

export function getCriterionPolicy(
  questionCode: QuestionCode,
  criterion: MissingComponent,
): CriterionPolicyDefinition | undefined {
  return criterionPolicyRegistry[questionCode]?.[criterion];
}
