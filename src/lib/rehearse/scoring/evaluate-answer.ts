import type {
  AttemptFeedback,
  CriterionAssessment,
  CriterionAssessmentStatus,
  EvaluationInput,
  EvaluationResult,
  MissingComponent,
  QuestionBankItem,
  QuestionCode,
  ScoreCap,
  StarCoverage,
  StarSection,
  StarSectionAssessment,
  StarSectionStatus,
} from "@/types/rehearse";
import { average, clamp } from "@/lib/utils";
import { scoreDelivery } from "@/lib/rehearse/delivery/metrics";
import { buildNudge } from "@/lib/rehearse/nudges/generate-nudge";
import { getCriterionPolicy } from "@/lib/rehearse/scoring/criterion-policies";

const starSections: StarSection[] = ["situation", "task", "action", "result"];
const criteriaOrder: MissingComponent[] = [
  "situation",
  "task",
  "action",
  "result",
  "metric",
  "ownership",
  "reflection",
  "tradeoff",
  "resistance",
  "strategic_layer",
];

const specificActionVerbs = [
  "built",
  "created",
  "aligned",
  "designed",
  "implemented",
  "prioritized",
  "decided",
  "launched",
  "changed",
  "introduced",
  "mapped",
  "reset",
  "documented",
  "negotiated",
  "escalated",
  "analyzed",
  "coordinated",
  "reviewed",
  "tested",
  "measured",
  "automated",
  "drafted",
  "reworked",
  "planned",
  "met",
  "discussed",
  "agreed",
  "proposed",
  "facilitated",
  "reframed",
  "shifted",
  "resolved",
  "coached",
  "scoped",
  "translated",
  "delivered",
  "ran",
];
const genericActionVerbs = [
  "led",
  "managed",
  "helped",
  "worked",
  "supported",
  "handled",
  "fixed",
  "drove",
  "owned",
];
const collaborativeActionVerbs = [
  "decided",
  "agreed",
  "created",
  "changed",
  "introduced",
  "reviewed",
  "shifted",
  "resolved",
  "built",
  "set up",
];

const situationContextPattern =
  /\bwhen|while|during|at the time|in my role|working on|our team|the team|project|launch|migration|incident|rollout|process|pilot|business\b/;
const situationChallengePattern =
  /\bchallenge|challenging|problem|issue|constraint|deadline|behind|blocked|pressure|ambigu|uncertain|risk|delay|outage|conflict|backlog|shortage|complex|scope|friction|stalled|workload\b/;
const strongTaskPattern =
  /\bmy goal was|i needed to|i was responsible for|the task was|i had to|i owned|i was accountable for|my remit was|i was asked to|i was managing|i founded|i created\b/;
const weakTaskPattern =
  /\bgoal|responsible|task|objective|ownership|accountable|needed to|had to|remit\b/;
const actionDetailPattern =
  /\b(first|second|third|by|through|using|with|across|daily|weekly|timeline|plan|checklist|workstream|stakeholder|stakeholders|engineering|product|support|vendor|compliance|experiment|analysis|critical path|decision|feature|metric|review|checkpoint|options|pilot|prototype|mvp|requirements|scope)\b/;
const resultOutcomePattern =
  /\b(as a result|result|outcome|led to|reduced|improved|increased|decreased|grew|launched|delivered|cut|raised|lowered|prevented|saved|on time|rolled out|happy|happier)\b/;
const resultProofPattern =
  /\b(we knew|measured|tracked|saw|within|from\b.+\bto|customer|customers|adoption|retention|escalations|sla|complaints|tickets|conversion|activation|feedback|survey|renewal|retained|continued to use|adopted|usage|operational overhead|expense)\b/;
const genericResultPattern = /\b(solved|fixed|worked|successful|success|better|faster)\b/;
const metricPattern =
  /\b\d+(\.\d+)?\s?(%|percent|x|hours?|days?|weeks?|months?|years?|people|customers?|tickets?|orders?|incidents?|minutes?|seconds?|points?|times?)\b|\$\d+(,\d{3})*(\.\d+)?|\bover\s+\$?\d+(,\d{3})*(\.\d+)?\b|\bfrom\b[^.?!\n]{0,60}\bto\b/i;
const weakMetricPattern = /\b(faster|slower|more|less|materially|significantly|a lot|many|fewer)\b/;
const ownershipAnchorPattern = new RegExp(
  `\\bi\\b[^.!?\\n]{0,80}\\b(${[...specificActionVerbs, ...genericActionVerbs, "founded"].join("|")})\\b`,
);
const ownershipScopePattern =
  /\b(end-to-end|cross-functional|team|customer|restaurant|pilot|prototype|mvp|requirements|scope|portfolio|founders|operations|engineering|designers|staff|launch|business)\b/;
const reflectionPattern =
  /\b(i learned|what i learned|next time|if i did it again|that taught me|lesson|i would repeat|i would do differently|since then|going forward|now i)\b/;
const reflectionForwardPattern =
  /\b(next time|if i did it again|i would repeat|i would do differently|since then|going forward|now i)\b/;
const tradeoffPattern =
  /\btrade[- ]?off|instead of|rather than|versus|vs\.?|balanced|defer(red)?|cut\b[^.?!\n]{0,60}\bto\b|prioriti[sz]ed\b/;
const tradeoffRationalePattern =
  /\bbecause\b|\bso that\b|\bto protect\b|\bto keep\b|\bto avoid\b|\bthat would\b/;
const weakTradeoffPattern = /\bdecided to|chose to|picked\b/;
const explicitResistancePattern =
  /\bpushback|resistance|objection|disagreed|conflict|skeptical|concerned|friction|tension|blocked\b/;
const impliedResistancePattern =
  /\bworkload increased|adjacent team|tighter turnaround|operational burden|downstream pain|issue was that|challenge(s)? for|strain|unhappy|hesitant|slow them down|affected team|concern raised\b/;
const strategicPattern =
  /\bcompany|organization|org|team-wide|roadmap|business|customer|executive|system|operational advantage|expense|planning|wider team|wider business\b/;

type CriterionAssessmentMap = Record<MissingComponent, CriterionAssessment>;

interface AssessmentContext {
  transcript: string;
  normalized: string;
  sentences: string[];
  questionCode: QuestionCode;
  wordCount: number;
}

export function evaluateAnswerHeuristically(input: EvaluationInput): {
  evaluation: EvaluationResult;
  feedback: AttemptFeedback;
} {
  const transcript = input.transcript.trim();
  const normalized = transcript.toLowerCase();
  const deliveryScore = scoreDelivery(input.deliveryMetrics);
  const criterionAssessment = assessCriteria(transcript, input.question.code);
  const starAssessment = toStarAssessment(criterionAssessment);
  const missingComponents = deriveMissingComponents(
    criterionAssessment,
    input.question.code,
    input.question.rubric.mustInclude,
  );
  const strengths = detectStrengths(
    criterionAssessment,
    input.question,
    input.cvSummary,
  );
  const rawScore = scoreContent(input.question, criterionAssessment);
  const capsApplied = detectCaps(input, criterionAssessment, normalized);
  const cappedScore = normalizeTopScore(applyCaps(rawScore, capsApplied), missingComponents);
  const weightedContentScore = roundScore(cappedScore * input.seniorityMultiplier);
  const weightedContentMax = roundScore(5 * input.seniorityMultiplier);

  const evaluation: EvaluationResult = {
    contentScoreRaw: rawScore,
    finalContentScoreAfterCaps: cappedScore,
    weightedContentScore,
    weightedContentMax,
    deliveryScore,
    criterionAssessment,
    starAssessment,
    missingComponents,
    strengths,
    nudges:
      missingComponents.length > 0
        ? [buildNudge(input.question, strengths, missingComponents)]
        : [],
    capsApplied,
    contentReasoning: {
      structure: describeStructure(starAssessment),
      ownership: criterionAssessment.ownership.reason,
      metrics: criterionAssessment.metric.reason,
      tradeoffs: criterionAssessment.tradeoff.reason,
      reflection: criterionAssessment.reflection.reason,
    },
    deliveryReasoning: {
      clarity:
        deliveryScore >= 4
          ? "The answer is clear and easy to follow."
          : "The answer needs tighter structure and clearer signposting.",
      pacing:
        input.deliveryMetrics.wordsPerMinute >= 120 &&
        input.deliveryMetrics.wordsPerMinute <= 170
          ? "Pacing sits in a strong rehearsal range."
          : "Pacing needs calibration for a calmer delivery.",
      fillerAssessment:
        input.deliveryMetrics.fillerRate < 3
          ? "Filler usage is controlled."
          : "Filler words are noticeable and weaken delivery confidence.",
      conciseness:
        input.deliveryMetrics.durationSeconds <= 180
          ? "Length is close to the ideal interview window."
          : "The answer is running long and should be tightened.",
    },
    roleRelevance: buildRoleRelevance(input),
  };

  const feedback = buildAttemptFeedback(evaluation, input);
  return { evaluation, feedback };
}

export function assessCriteria(
  transcript: string,
  questionCode: QuestionCode,
): CriterionAssessmentMap {
  const source = transcript.trim();
  const context: AssessmentContext = {
    transcript: source,
    normalized: source.toLowerCase(),
    sentences: splitIntoSentences(source),
    questionCode,
    wordCount: source.split(/\s+/).filter(Boolean).length,
  };

  const assessment: CriterionAssessmentMap = {
    situation: assessSituation(context),
    task: assessTask(context),
    action: assessAction(context),
    result: assessResult(context),
    metric: assessMetric(context),
    ownership: assessOwnership(context),
    reflection: assessReflection(context),
    tradeoff: assessTradeoff(context),
    resistance: assessResistance(context),
    strategic_layer: assessStrategicLayer(context),
  };

  return applyShortAnswerFloor(assessment, context.wordCount);
}

export function assessStarSections(
  transcript: string,
  questionCode: QuestionCode,
): Record<StarSection, StarSectionAssessment> {
  return toStarAssessment(assessCriteria(transcript, questionCode));
}

export function detectMissingComponents(
  transcript: string,
  questionCode: QuestionCode,
  criterionAssessment = assessCriteria(transcript, questionCode),
  requiredCriteria?: MissingComponent[],
): MissingComponent[] {
  return deriveMissingComponents(criterionAssessment, questionCode, requiredCriteria);
}

export function deriveMissingComponents(
  criterionAssessment: CriterionAssessmentMap,
  questionCode: QuestionCode,
  requiredCriteria?: MissingComponent[],
): MissingComponent[] {
  const relevant = getRelevantCriteria(questionCode, requiredCriteria);
  return relevant.filter((criterion) => criterionAssessment[criterion].status === "missing");
}

export function normalizeCriterionAssessment(
  candidate: Partial<Record<MissingComponent, CriterionAssessment>> | undefined,
  transcript: string,
  questionCode: QuestionCode,
): CriterionAssessmentMap {
  const heuristic = assessCriteria(transcript, questionCode);
  if (!candidate) {
    return heuristic;
  }

  return criteriaOrder.reduce<CriterionAssessmentMap>((accumulator, criterion) => {
    const parsed = candidate[criterion];
    const fallback = heuristic[criterion];
    const parsedStatus = parsed?.status ?? fallback.status;
    const status =
      parsedStatus === "covered" && fallback.status !== "covered"
        ? "weak"
        : parsedStatus;

    accumulator[criterion] = buildCriterionAssessment(
      status,
      parsed?.reason?.trim() || fallback.reason,
      parsed?.evidence?.trim() || fallback.evidence,
      parsed?.strictnessNote?.trim() || fallback.strictnessNote,
    );
    return accumulator;
  }, {} as CriterionAssessmentMap);
}

export function normalizeStarAssessment(
  candidate: Record<StarSection, StarSectionAssessment> | undefined,
  transcript: string,
  questionCode: QuestionCode,
): Record<StarSection, StarSectionAssessment> {
  const criterionAssessment = normalizeCriterionAssessment(undefined, transcript, questionCode);
  const fallback = toStarAssessment(criterionAssessment);
  if (!candidate) {
    return fallback;
  }

  return starSections.reduce<Record<StarSection, StarSectionAssessment>>((accumulator, section) => {
    const parsed = candidate[section];
    const heuristic = fallback[section];
    const parsedStatus = parsed?.status ?? heuristic.status;
    const status =
      parsedStatus === "covered" && heuristic.status !== "covered"
        ? "weak"
        : parsedStatus;

    accumulator[section] = buildStarSectionAssessment(
      status,
      parsed?.reason?.trim() || heuristic.reason,
      parsed?.evidence?.trim() || heuristic.evidence,
      parsed?.strictnessNote?.trim() || heuristic.strictnessNote,
    );
    return accumulator;
  }, {} as Record<StarSection, StarSectionAssessment>);
}

function detectStrengths(
  criterionAssessment: CriterionAssessmentMap,
  question: QuestionBankItem,
  cvSummary?: EvaluationInput["cvSummary"],
) {
  const strengths: string[] = [];

  if (starSections.every((section) => criterionAssessment[section].status === "covered")) {
    strengths.push("clear STAR structure");
  }
  if (criterionAssessment.ownership.status === "covered") strengths.push("explicit ownership");
  if (criterionAssessment.metric.status === "covered") strengths.push("quantified impact");
  if (criterionAssessment.tradeoff.status === "covered") strengths.push("trade-off clarity");
  if (criterionAssessment.reflection.status === "covered" && question.code !== "Q10") {
    strengths.push("useful reflection");
  }
  if (criterionAssessment.resistance.status === "covered" && ["Q2", "Q4"].includes(question.code)) {
    strengths.push("credible resistance handling");
  }
  if (criterionAssessment.strategic_layer.status === "covered") {
    strengths.push("broader strategic framing");
  }
  if ((cvSummary?.quantifiedAchievements?.length ?? 0) > 0) {
    strengths.push("room to anchor the answer in a real CV achievement");
  }

  return strengths.slice(0, 4);
}

function scoreContent(
  question: QuestionBankItem,
  criterionAssessment: CriterionAssessmentMap,
): 1 | 2 | 3 | 4 | 5 {
  const relevantCriteria = getRelevantCriteria(question.code, question.rubric.mustInclude);
  const requiredQuality = relevantCriteria.reduce(
    (sum, criterion) => sum + criterionAssessment[criterion].qualityScore,
    0,
  );
  const ratio = relevantCriteria.length === 0 ? 0 : requiredQuality / (relevantCriteria.length * 2);
  const allRequiredCovered = relevantCriteria.every(
    (criterion) => criterionAssessment[criterion].status === "covered",
  );
  const missingRequiredCount = relevantCriteria.filter(
    (criterion) => criterionAssessment[criterion].status === "missing",
  ).length;
  const weakRequiredCount = relevantCriteria.filter(
    (criterion) => criterionAssessment[criterion].status === "weak",
  ).length;
  const strategicBonus =
    criterionAssessment.strategic_layer.status === "covered" &&
    ["Q1", "Q4", "Q10"].includes(question.code)
      ? 0.04
      : 0;
  const adjustedRatio = clamp(ratio + strategicBonus, 0, 1);

  if (adjustedRatio < 0.3 || missingRequiredCount >= Math.ceil(relevantCriteria.length / 2)) {
    return 1;
  }
  if (adjustedRatio < 0.52) {
    return 2;
  }
  if (adjustedRatio < 0.72) {
    return 3;
  }
  if (!allRequiredCovered || weakRequiredCount > 0 || adjustedRatio < 0.9) {
    return 4;
  }
  return 5;
}

export function detectCaps(
  input: EvaluationInput,
  criterionAssessmentOrMissing: CriterionAssessmentMap | MissingComponent[],
  normalized: string,
) {
  const caps: ScoreCap[] = [];
  const requiredCriteria = new Set(getRelevantCriteria(input.question.code, input.question.rubric.mustInclude));
  const criterionAssessment = Array.isArray(criterionAssessmentOrMissing)
    ? toCriterionAssessmentFromMissing(criterionAssessmentOrMissing)
    : criterionAssessmentOrMissing;

  if (requiredCriteria.has("result") && criterionAssessment.result.status !== "covered") {
    caps.push("no_result");
  }
  if (requiredCriteria.has("ownership") && criterionAssessment.ownership.status !== "covered") {
    caps.push("no_ownership");
  }
  if (requiredCriteria.has("metric") && criterionAssessment.metric.status !== "covered") {
    caps.push("no_metric");
  }
  if (
    requiredCriteria.has("reflection") &&
    input.question.code !== "Q10" &&
    criterionAssessment.reflection.status !== "covered"
  ) {
    caps.push("no_reflection");
  }

  const seniorityNeedsTradeoff =
    input.seniorityLevel === "senior" ||
    input.seniorityLevel === "lead_principal" ||
    input.seniorityLevel === "manager_director";
  if (
    seniorityNeedsTradeoff &&
    requiredCriteria.has("tradeoff") &&
    criterionAssessment.tradeoff.status !== "covered"
  ) {
    caps.push("no_tradeoff_senior_plus");
  }

  if (input.deliveryMetrics.durationSeconds < 30) {
    caps.push("short_answer_cap");
  }

  if (detectAuthenticityFlag(normalized, input.previousAttempts)) {
    caps.push("authenticity_flag");
  }

  return Array.from(new Set(caps));
}

export function applyCaps(
  rawScore: 1 | 2 | 3 | 4 | 5,
  capsApplied: ScoreCap[],
): 1 | 2 | 3 | 4 | 5 {
  const ceiling = capsApplied.reduce<number>((current, cap) => {
    switch (cap) {
      case "no_result":
      case "short_answer_cap":
        return Math.min(current, 2);
      case "no_ownership":
      case "no_metric":
      case "no_tradeoff_senior_plus":
        return Math.min(current, 3);
      case "no_reflection":
      case "authenticity_flag":
        return Math.min(current, 4);
      default:
        return current;
    }
  }, rawScore);

  return clamp(ceiling, 1, 5) as 1 | 2 | 3 | 4 | 5;
}

export function buildAttemptFeedback(
  evaluation: EvaluationResult,
  input: EvaluationInput,
): AttemptFeedback {
  const leverage =
    input.cvSummary?.quantifiedAchievements?.slice(0, 2).map((achievement) => {
      return `You could have referenced ${achievement.description}.`;
    }) ?? [];
  const strengths =
    evaluation.strengths.length > 0
      ? evaluation.strengths.map(toCandidateStrength)
      : ["You kept the answer concise enough to build on."];
  const improveNext = buildImproveNext(evaluation, input);
  const verdict = describeVerdict(evaluation.finalContentScoreAfterCaps);
  const headline = buildHeadline(evaluation, input.question);
  const scoreExplanation = buildScoreExplanation(evaluation, input.question);
  const deliverySummary = buildDeliverySummary(evaluation);
  const retryPrompt = buildRetryPrompt(evaluation, input.question, improveNext);
  const answerStarter = buildAnswerStarter(
    evaluation.starAssessment,
    evaluation.missingComponents,
    input.question.code,
  );
  const missingElements = evaluation.missingComponents.map(formatMissingComponent);
  const roleRelevance = buildRoleRelevanceFeedback(evaluation.roleRelevance);

  return {
    verdict,
    headline,
    scoreExplanation,
    strengths,
    improveNext,
    deliverySummary,
    retryPrompt,
    starCoverage: toStarCoverage(evaluation.starAssessment),
    missingElements,
    answerStarter,
    cvLeverage: leverage.length > 0 ? leverage : undefined,
    roleRelevance,
    spokenRecap: buildSpokenRecap(headline, scoreExplanation, improveNext, roleRelevance),
  };
}

function describeVerdict(score: EvaluationResult["finalContentScoreAfterCaps"]) {
  switch (score) {
    case 5:
      return "Excellent answer";
    case 4:
      return "Strong answer";
    case 3:
      return "Good answer";
    case 2:
      return "Partial answer";
    default:
      return "Needs work";
  }
}

function buildHeadline(evaluation: EvaluationResult, question: QuestionBankItem) {
  const unresolved = rankFollowUpCriteria(question, evaluation);
  const top = unresolved[0];
  const allStarCovered = starSections.every(
    (section) => evaluation.starAssessment[section].status === "covered",
  );

  if (evaluation.finalContentScoreAfterCaps === 5) {
    return "Clear, specific, and interview-ready from start to finish.";
  }

  if (evaluation.finalContentScoreAfterCaps === 4) {
    if (!top) {
      return "Strong, convincing answer with only minor refinement left.";
    }
    return `Strong, credible example. To make it excellent, sharpen the ${formatCriterionForHeadline(top.criterion)}.`;
  }

  if (evaluation.finalContentScoreAfterCaps === 3 && allStarCovered) {
    if (!top) {
      return "Clear, convincing example with room to add a bit more senior-level depth.";
    }
    return `Clear, convincing example. To move it from good to strong, add the ${formatCriterionForHeadline(top.criterion)}.`;
  }

  if (evaluation.starAssessment.result.status !== "covered") {
    return evaluation.starAssessment.result.status === "weak"
      ? "You hinted at the outcome, but it still does not prove what changed."
      : "The story needs a clearer result so the answer actually lands.";
  }

  if (evaluation.starAssessment.action.status !== "covered") {
    return evaluation.starAssessment.action.status === "weak"
      ? "You named your role, but not enough of what you actually did."
      : "I can tell what the project was, but not enough about what you actually did.";
  }

  if (top) {
    return `There is a credible answer here, but the ${formatCriterionForHeadline(top.criterion)} still needs more depth.`;
  }

  return "There is a good answer here, but the structure still needs tightening.";
}

function buildScoreExplanation(evaluation: EvaluationResult, question: QuestionBankItem) {
  const unresolved = rankFollowUpCriteria(question, evaluation).slice(0, 2);
  if (unresolved.length === 0) {
    return "All of the required criteria are covered strongly enough for this question.";
  }

  const unresolvedText = unresolved.map((entry) => formatCriterionForExplanation(entry.criterion)).join(" and ");
  const allStarCovered = starSections.every(
    (section) => evaluation.starAssessment[section].status === "covered",
  );

  if (allStarCovered) {
    return `All STAR sections are covered. This stays at ${evaluation.finalContentScoreAfterCaps}/5 because ${unresolvedText} ${unresolved.length === 1 ? "is" : "are"} still not strong enough.`;
  }

  return `This lands at ${evaluation.finalContentScoreAfterCaps}/5 because ${unresolvedText} ${unresolved.length === 1 ? "still needs" : "still need"} more interview-ready detail.`;
}

function buildImproveNext(
  evaluation: EvaluationResult,
  input: EvaluationInput,
) {
  const criterionSuggestions = rankFollowUpCriteria(input.question, evaluation).map(({ criterion, status }) =>
    buildCriterionSuggestion(criterion, status),
  );
  const suggestions = [
    ...criterionSuggestions,
    ...buildDeliveryImproveNext(input),
  ];

  const unique = Array.from(new Set(suggestions.filter(Boolean)));
  return unique.length > 0
    ? unique
    : ["Keep this structure and make the final impact even more specific."];
}

function buildDeliveryImproveNext(input: EvaluationInput) {
  const suggestions: string[] = [];
  if (input.deliveryMetrics.wordsPerMinute > 175) {
    suggestions.push("Slow the pacing slightly so the structure is easier to follow.");
  } else if (input.deliveryMetrics.wordsPerMinute > 0 && input.deliveryMetrics.wordsPerMinute < 110) {
    suggestions.push("Pick up the pacing slightly so the answer keeps its momentum.");
  }

  if (input.deliveryMetrics.fillerRate >= 3) {
    suggestions.push("Cut filler words so the answer sounds more confident.");
  }

  if (input.deliveryMetrics.durationSeconds > 180) {
    suggestions.push("Tighten the answer so it lands inside a focused two-minute arc.");
  }

  if (input.deliveryMetrics.longPauseCount >= 2) {
    suggestions.push("Reduce long pauses so the answer feels more deliberate than hesitant.");
  }

  if (input.deliveryMetrics.fragmentationScore >= 4) {
    suggestions.push("Use clearer signposting so each part of the answer connects cleanly.");
  }

  return suggestions;
}

function buildRetryPrompt(
  evaluation: EvaluationResult,
  question: QuestionBankItem,
  improveNext: string[],
) {
  const focus = rankFollowUpCriteria(question, evaluation)[0];
  if (!focus || improveNext.length === 0) {
    return "Try again with the same structure and make the final impact even more concrete.";
  }

  switch (focus.criterion) {
    case "result":
      return focus.status === "weak"
        ? "Try again and make the outcome concrete enough to prove that it worked."
        : "Try again and make the result and what changed because of your work unmistakably clear.";
    case "action":
      return focus.status === "weak"
        ? "Try again and add the decisions and execution detail behind your actions."
        : "Try again and spend more time on the actions you personally drove.";
    case "tradeoff":
      return "Try again and explain the trade-off you had to make and why you chose that path.";
    case "reflection":
      return "Try again and close with what you learned and how you would apply it next time.";
    default:
      return `Try again and focus on this next: ${improveNext[0]}`;
  }
}

function buildSpokenRecap(
  headline: string,
  scoreExplanation: string,
  improveNext: string[],
  roleRelevance?: AttemptFeedback["roleRelevance"],
) {
  const coachingLine =
    improveNext.length > 0
      ? `Improve next: ${improveNext.map(stripTrailingPeriod).join("; ")}.`
      : "";
  const relevanceLine = roleRelevance
    ? `Role relevance: ${roleRelevance.headline} ${roleRelevance.bridge ?? roleRelevance.detail}`
    : "";

  return [headline, scoreExplanation, coachingLine, relevanceLine].filter(Boolean).join(" ").trim();
}

function buildRoleRelevanceFeedback(
  roleRelevance?: EvaluationResult["roleRelevance"],
) {
  if (!roleRelevance || roleRelevance.assessment === "not_enough_context") {
    return undefined;
  }

  switch (roleRelevance.assessment) {
    case "direct_match":
      return {
        assessment: roleRelevance.assessment,
        headline: "The example feels directly relevant to the role.",
        detail: roleRelevance.reasoning,
        bridge: roleRelevance.bridge,
      };
    case "transferable":
      return {
        assessment: roleRelevance.assessment,
        headline: "The example is transferable, but the role link needs to be explicit.",
        detail: roleRelevance.reasoning,
        bridge: roleRelevance.bridge,
      };
    case "weak_match":
      return {
        assessment: roleRelevance.assessment,
        headline: "The example feels too far from the role as told.",
        detail: roleRelevance.reasoning,
        bridge: roleRelevance.bridge,
      };
    default:
      return undefined;
  }
}

export function buildRoleRelevance(
  input: EvaluationInput,
  candidate?: EvaluationResult["roleRelevance"],
): NonNullable<EvaluationResult["roleRelevance"]> {
  const fallback = inferRoleRelevanceHeuristically(input);
  if (fallback.assessment === "not_enough_context") {
    return fallback;
  }

  if (!candidate) {
    return fallback;
  }

  const reasoning = candidate.reasoning.trim();
  const bridge = candidate.bridge?.trim() || null;
  if (!reasoning) {
    return fallback;
  }

  return {
    assessment: candidate.assessment,
    reasoning,
    bridge,
  };
}

function inferRoleRelevanceHeuristically(
  input: EvaluationInput,
): NonNullable<EvaluationResult["roleRelevance"]> {
  const priorities = collectRolePriorities(input);
  if (priorities.length === 0) {
    return {
      assessment: "not_enough_context",
      reasoning: "There is not enough role context to judge how closely this example maps to the target role.",
      bridge: null,
    };
  }

  const transcriptTerms = extractSignalTerms([input.transcript]);
  const matchedPriorities = priorities.filter((priority) =>
    Array.from(extractSignalTerms([priority])).some((term) => transcriptTerms.has(term)),
  );
  const transferableSignals = Array.from(transcriptTerms).filter((term) =>
    transferableRoleTerms.has(term),
  );
  const focus = priorities.slice(0, 2).join(" and ");

  if (matchedPriorities.length >= 2) {
    return {
      assessment: "direct_match",
      reasoning: `This example already speaks to ${matchedPriorities.slice(0, 2).join(" and ")} in the role.`,
      bridge: null,
    };
  }

  if (matchedPriorities.length >= 1 || transferableSignals.length >= 2) {
    return {
      assessment: "transferable",
      reasoning: `The story shows transferable strengths, but you need to connect them more explicitly to ${focus}.`,
      bridge: `Bridge it back by naming how this example proves you can handle ${focus} in this role.`,
    };
  }

  return {
    assessment: "weak_match",
    reasoning: `The example shows some capability, but it does not yet sound close enough to the core priorities of ${focus}.`,
    bridge: `Choose a closer example or explicitly tie this one to ${focus}.`,
  };
}

function collectRolePriorities(input: EvaluationInput) {
  const jd = input.jdSummary;
  if (!jd) {
    return [];
  }

  return Array.from(
    new Set(
      [...jd.coreCompetencies, ...jd.performanceKeywords]
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    ),
  );
}

function extractSignalTerms(values: string[]) {
  const terms = new Set<string>();
  for (const value of values) {
    for (const term of value.toLowerCase().split(/[^a-z0-9]+/)) {
      if (term.length < 4 || roleStopWords.has(term)) {
        continue;
      }
      terms.add(term);
    }
  }

  return terms;
}

function buildDeliverySummary(evaluation: EvaluationResult) {
  return [
    evaluation.deliveryReasoning.clarity,
    evaluation.deliveryReasoning.pacing,
    evaluation.deliveryReasoning.fillerAssessment,
    evaluation.deliveryReasoning.conciseness,
  ].join(" ");
}

export function rankFollowUpCriteria(
  question: QuestionBankItem,
  evaluation: EvaluationResult,
): Array<{ criterion: MissingComponent; status: CriterionAssessmentStatus; priority: number }> {
  const relevant = getRelevantCriteria(question.code, question.rubric.mustInclude);
  const criterionAssessment = resolveCriterionAssessment(evaluation);

  return relevant
    .filter((criterion) => criterionAssessment[criterion].status !== "covered")
    .map((criterion) => {
      const status = criterionAssessment[criterion].status;
      return {
        criterion,
        status,
        priority: getFollowUpPriorityScore(question, evaluation, criterion, status),
      };
    })
    .sort((left, right) => right.priority - left.priority);
}

function getFollowUpPriorityScore(
  question: QuestionBankItem,
  evaluation: EvaluationResult,
  criterion: MissingComponent,
  status: CriterionAssessmentStatus,
) {
  const base: Record<MissingComponent, number> = {
    result: 120,
    tradeoff: 108,
    metric: 102,
    ownership: 96,
    action: 94,
    reflection: 82,
    resistance: 80,
    task: 72,
    situation: 68,
    strategic_layer: 60,
  };
  const activeCapBonus =
    (criterion === "result" && evaluation.capsApplied.includes("no_result")) ||
    (criterion === "ownership" && evaluation.capsApplied.includes("no_ownership")) ||
    (criterion === "metric" && evaluation.capsApplied.includes("no_metric")) ||
    (criterion === "reflection" && evaluation.capsApplied.includes("no_reflection")) ||
    (criterion === "tradeoff" &&
      evaluation.capsApplied.includes("no_tradeoff_senior_plus"))
      ? 24
      : 0;
  const questionBonus =
    (criterion === "tradeoff" && question.code === "Q1") ||
    (criterion === "resistance" && ["Q2", "Q4"].includes(question.code)) ||
    (criterion === "reflection" && ["Q2", "Q3", "Q9"].includes(question.code))
      ? 8
      : 0;

  return base[criterion] + activeCapBonus + questionBonus + (status === "missing" ? 6 : 0);
}

const roleStopWords = new Set([
  "about",
  "across",
  "along",
  "also",
  "because",
  "being",
  "core",
  "from",
  "into",
  "needs",
  "role",
  "team",
  "that",
  "this",
  "with",
]);

const transferableRoleTerms = new Set([
  "aligned",
  "analysis",
  "built",
  "change",
  "coach",
  "coached",
  "customer",
  "decision",
  "delivered",
  "designed",
  "execution",
  "improved",
  "launched",
  "leader",
  "leadership",
  "managed",
  "mentor",
  "mentored",
  "operational",
  "prioritized",
  "roadmap",
  "stakeholder",
  "strategy",
]);

function buildAnswerStarter(
  starAssessment: Record<StarSection, StarSectionAssessment>,
  missing: MissingComponent[],
  questionCode: QuestionCode,
) {
  if (
    starSections.every((section) => starAssessment[section].status === "covered") &&
    missing.length === 0
  ) {
    return "Start with one sentence of context, spend most of the answer on your actions, and close on the result.";
  }

  if (
    starAssessment.situation.status !== "covered" ||
    (questionCode !== "Q10" && starAssessment.task.status !== "covered")
  ) {
    return questionCode === "Q10"
      ? "Open with the strongest reason you match this role, then support it with evidence."
      : "Start with: In my role, I was responsible for..., and the challenge was...";
  }

  if (starAssessment.action.status !== "covered") {
    return "Then continue with: I focused on three things. First..., second..., and third...";
  }

  if (starAssessment.result.status !== "covered" || missing.includes("metric")) {
    return "Close with: As a result, we changed X to Y, which meant...";
  }

  return "Reshape the answer into context, your actions, and the result you produced.";
}

function toCandidateStrength(value: string) {
  switch (value) {
    case "clear STAR structure":
      return "You gave the story a clear STAR shape.";
    case "explicit ownership":
      return "You sound like the person who drove the work.";
    case "quantified impact":
      return "You included measurable impact.";
    case "trade-off clarity":
      return "You explained the trade-off behind the decision.";
    case "useful reflection":
      return "You showed what you learned from the experience.";
    case "credible resistance handling":
      return "You showed the real tension you had to work through.";
    case "broader strategic framing":
      return "You connected the story to the wider business context.";
    case "room to anchor the answer in a real CV achievement":
      return "You have strong experience to pull in from your background.";
    default:
      return value;
  }
}

function formatMissingComponent(value: MissingComponent) {
  switch (value) {
    case "strategic_layer":
      return "broader business impact";
    default:
      return value.replaceAll("_", " ");
  }
}

function describeStructure(starAssessment: Record<StarSection, StarSectionAssessment>) {
  const coveredCount = getStarSectionsByStatus(starAssessment, "covered").length;
  const weakCount = getStarSectionsByStatus(starAssessment, "weak").length;

  if (coveredCount === 4) {
    return "The answer follows a recognizable STAR flow.";
  }
  if (coveredCount + weakCount >= 2) {
    return "The answer has a STAR shape, but parts of it are still too thin to count as fully covered.";
  }
  return "The answer needs a clearer STAR shape.";
}

function detectAuthenticityFlag(normalized: string, previousAttempts: string[]) {
  if (previousAttempts.length === 0) {
    return false;
  }

  const previousScores = previousAttempts.map((attempt) =>
    textSimilarity(normalized, attempt.toLowerCase()),
  );
  const highestSimilarity = Math.max(...previousScores);

  const unrealisticMetric =
    /(\d{3,}0%|\b3000%|\b5000%|\b10000\b)/.test(normalized) &&
    !/(baseline|from|to|over|within)/.test(normalized);

  return highestSimilarity > 0.92 || unrealisticMetric;
}

function textSimilarity(left: string, right: string) {
  const leftTokens = new Set(left.split(/\W+/).filter(Boolean));
  const rightTokens = new Set(right.split(/\W+/).filter(Boolean));
  const shared = Array.from(leftTokens).filter((token) => rightTokens.has(token));
  const union = new Set([...Array.from(leftTokens), ...Array.from(rightTokens)]);
  return union.size === 0 ? 0 : shared.length / union.size;
}

function splitIntoSentences(text: string) {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function assessSituation(context: AssessmentContext) {
  const evidence = findEvidence(context.sentences, (sentence) => {
    const lowered = sentence.toLowerCase();
    return situationContextPattern.test(lowered) || situationChallengePattern.test(lowered);
  });
  const hasContext = situationContextPattern.test(context.normalized);
  const hasChallenge = situationChallengePattern.test(context.normalized);

  if (hasContext && hasChallenge) {
    return buildCriterionAssessment(
      "covered",
      "The answer sets up both the context and the challenge clearly enough to anchor the story.",
      evidence,
    );
  }

  if (hasContext || hasChallenge) {
    return buildCriterionAssessment(
      "weak",
      "You hinted at the context, but the challenge still is not concrete.",
      evidence,
    );
  }

  return buildCriterionAssessment(
    "missing",
    "The answer never sets up the situation or why it was challenging.",
    null,
  );
}

function assessTask(context: AssessmentContext) {
  const policy = getCriterionPolicy(context.questionCode, "task");
  const evidence = findEvidence(context.sentences, (sentence) => {
    const lowered = sentence.toLowerCase();
    return (
      strongTaskPattern.test(lowered) ||
      weakTaskPattern.test(lowered) ||
      containsAny(lowered, policy?.covered) ||
      containsAny(lowered, policy?.weak)
    );
  });
  const hasStrongTask = strongTaskPattern.test(context.normalized) || containsAny(context.normalized, policy?.covered);
  const hasWeakTask =
    weakTaskPattern.test(context.normalized) ||
    containsAny(context.normalized, policy?.weak) ||
    (ownershipAnchorPattern.test(context.normalized) && !ownershipScopePattern.test(context.normalized));

  if (hasStrongTask) {
    return buildCriterionAssessment(
      "covered",
      "The answer states the speaker's remit or responsibility clearly enough to count.",
      evidence,
      policy?.strictnessNote,
    );
  }

  if (hasWeakTask) {
    return buildCriterionAssessment(
      "weak",
      "The answer gestures at ownership, but it does not clearly state the speaker's responsibility.",
      evidence,
      policy?.strictnessNote,
    );
  }

  return buildCriterionAssessment(
    "missing",
    "The answer never states what the speaker was personally responsible for.",
    null,
    policy?.strictnessNote,
  );
}

function assessAction(context: AssessmentContext) {
  const policy = getCriterionPolicy(context.questionCode, "action");
  const specificPersonalActionPattern = new RegExp(
    `\\bi\\b[^.!?\\n]{0,160}\\b(${specificActionVerbs.join("|")})\\b`,
  );
  const genericPersonalActionPattern = new RegExp(
    `\\bi\\b[^.!?\\n]{0,160}\\b(${genericActionVerbs.join("|")})\\b`,
  );
  const collaborativeActionPattern = new RegExp(
    `\\bwe\\b[^.!?\\n]{0,120}\\b(${collaborativeActionVerbs.join("|")})\\b`,
  );
  const evidence = findEvidence(context.sentences, (sentence) => {
    const lowered = sentence.toLowerCase();
    return (
      specificPersonalActionPattern.test(lowered) ||
      genericPersonalActionPattern.test(lowered) ||
      collaborativeActionPattern.test(lowered) ||
      containsAny(lowered, policy?.covered)
    );
  });
  const specificPersonalActionCount = context.sentences.filter((sentence) => {
    const lowered = sentence.toLowerCase();
    return specificPersonalActionPattern.test(lowered) || containsAny(lowered, policy?.covered);
  }).length;
  const hasSpecificPersonalAction =
    specificPersonalActionPattern.test(context.normalized) || containsAny(context.normalized, policy?.covered);
  const hasGenericPersonalAction = genericPersonalActionPattern.test(context.normalized);
  const hasCollaborativeAction =
    collaborativeActionPattern.test(context.normalized) || containsAny(context.normalized, policy?.weak);
  const hasActionDetail =
    actionDetailPattern.test(context.normalized) ||
    specificPersonalActionCount >= 2 ||
    /\bthen\b|\bafter\b|\bfinally\b|\boption(s)?\b/.test(context.normalized);
  const anchoredOwnership = hasOwnershipAnchor(context.normalized);

  if (
    (hasSpecificPersonalAction && hasActionDetail) ||
    (anchoredOwnership && hasCollaborativeAction && (hasActionDetail || hasSpecificPersonalAction))
  ) {
    return buildCriterionAssessment(
      "covered",
      "The answer explains concrete actions and execution detail, not just a generic claim of leadership.",
      evidence,
      policy?.strictnessNote,
    );
  }

  if (hasSpecificPersonalAction || hasGenericPersonalAction || hasCollaborativeAction) {
    return buildCriterionAssessment(
      "weak",
      "You named your role, but not enough of what you actually did.",
      evidence,
      policy?.strictnessNote,
    );
  }

  return buildCriterionAssessment(
    "missing",
    "The answer does not explain the actions the speaker took.",
    null,
    policy?.strictnessNote,
  );
}

function assessResult(context: AssessmentContext) {
  const evidence = findEvidence(context.sentences, (sentence) => {
    const lowered = sentence.toLowerCase();
    return (
      resultOutcomePattern.test(lowered) ||
      resultProofPattern.test(lowered) ||
      genericResultPattern.test(lowered)
    );
  });
  const hasOutcome = resultOutcomePattern.test(context.normalized);
  const hasProof = metricPattern.test(context.normalized) || resultProofPattern.test(context.normalized);

  if (hasOutcome && hasProof) {
    return buildCriterionAssessment(
      "covered",
      "The answer makes the outcome concrete and explains how success showed up.",
      evidence,
    );
  }

  if (hasOutcome || genericResultPattern.test(context.normalized)) {
    return buildCriterionAssessment(
      "weak",
      "You implied an outcome, but not clearly enough to prove impact.",
      evidence,
    );
  }

  return buildCriterionAssessment(
    "missing",
    "The answer never lands on what changed or how success was known.",
    null,
  );
}

function assessMetric(context: AssessmentContext) {
  const evidence = findEvidence(context.sentences, (sentence) => {
    const lowered = sentence.toLowerCase();
    return metricPattern.test(lowered) || weakMetricPattern.test(lowered);
  });

  if (metricPattern.test(context.normalized)) {
    return buildCriterionAssessment(
      "covered",
      "The answer includes quantified evidence or a clear before-and-after.",
      evidence,
    );
  }

  if (weakMetricPattern.test(context.normalized)) {
    return buildCriterionAssessment(
      "weak",
      "The answer suggests impact, but not with enough precision to count as measurable proof.",
      evidence,
    );
  }

  return buildCriterionAssessment(
    "missing",
    "The answer does not include a metric or a concrete before-and-after indicator.",
    null,
  );
}

function assessOwnership(context: AssessmentContext) {
  const policy = getCriterionPolicy(context.questionCode, "ownership");
  const evidence = findEvidence(context.sentences, (sentence) => {
    const lowered = sentence.toLowerCase();
    return (
      hasOwnershipAnchor(lowered) ||
      containsAny(lowered, policy?.covered) ||
      containsAny(lowered, policy?.weak)
    );
  });
  const hasClearAnchor = hasOwnershipAnchor(context.normalized) || containsAny(context.normalized, policy?.covered);
  const hasScope = ownershipScopePattern.test(context.normalized) || countFirstPersonStatements(context.normalized) >= 2;
  const hasWeakSignal =
    /\bi\b/.test(context.normalized) ||
    containsAny(context.normalized, policy?.weak);

  if (hasClearAnchor && hasScope) {
    return buildCriterionAssessment(
      "covered",
      "The answer makes the speaker's personal ownership and role in the work clear.",
      evidence,
      policy?.strictnessNote,
    );
  }

  if (hasClearAnchor || hasWeakSignal) {
    return buildCriterionAssessment(
      "weak",
      "You hinted at your ownership, but your responsibility is still too vague.",
      evidence,
      policy?.strictnessNote,
    );
  }

  return buildCriterionAssessment(
    "missing",
    "The answer never makes the speaker's own contribution clear enough.",
    null,
    policy?.strictnessNote,
  );
}

function assessReflection(context: AssessmentContext) {
  const evidence = findEvidence(context.sentences, (sentence) =>
    reflectionPattern.test(sentence.toLowerCase()),
  );
  const hasReflection = reflectionPattern.test(context.normalized);
  const hasForwardApplication = reflectionForwardPattern.test(context.normalized);

  if (hasReflection && hasForwardApplication) {
    return buildCriterionAssessment(
      "covered",
      "The answer closes with a clear learning and how the speaker would apply it next time.",
      evidence,
    );
  }

  if (hasReflection) {
    return buildCriterionAssessment(
      "weak",
      "The answer hints at a lesson, but the reflection still feels generic.",
      evidence,
    );
  }

  return buildCriterionAssessment(
    "missing",
    "The answer does not close with a learning or reflection.",
    null,
  );
}

function assessTradeoff(context: AssessmentContext) {
  const policy = getCriterionPolicy(context.questionCode, "tradeoff");
  const evidence = findEvidence(context.sentences, (sentence) => {
    const lowered = sentence.toLowerCase();
    return (
      tradeoffPattern.test(lowered) ||
      weakTradeoffPattern.test(lowered) ||
      containsAny(lowered, policy?.covered) ||
      containsAny(lowered, policy?.falsePositive)
    );
  });
  const hasTradeoffSignal = tradeoffPattern.test(context.normalized) || containsAny(context.normalized, policy?.covered);
  const hasRationale = tradeoffRationalePattern.test(context.normalized);
  const weakTradeoffSignal =
    weakTradeoffPattern.test(context.normalized) || containsAny(context.normalized, policy?.falsePositive);

  if (hasTradeoffSignal && hasRationale) {
    return buildCriterionAssessment(
      "covered",
      "The answer explains the trade-off and why that path was chosen over the alternative.",
      evidence,
      policy?.strictnessNote,
    );
  }

  if (hasTradeoffSignal || weakTradeoffSignal) {
    return buildCriterionAssessment(
      "weak",
      "The answer hints at a decision, but not the trade-off behind it clearly enough.",
      evidence,
      policy?.strictnessNote,
    );
  }

  return buildCriterionAssessment(
    "missing",
    "The answer does not explain a meaningful trade-off or prioritisation call.",
    null,
    policy?.strictnessNote,
  );
}

function assessResistance(context: AssessmentContext) {
  const policy = getCriterionPolicy(context.questionCode, "resistance");
  const evidence = findEvidence(context.sentences, (sentence) => {
    const lowered = sentence.toLowerCase();
    return (
      explicitResistancePattern.test(lowered) ||
      impliedResistancePattern.test(lowered) ||
      containsAny(lowered, policy?.covered)
    );
  });
  const hasExplicitResistance = explicitResistancePattern.test(context.normalized);
  const hasImplicitResistance =
    impliedResistancePattern.test(context.normalized) || containsAny(context.normalized, policy?.covered);
  const hasWeakResistance =
    /\bissue|concern|challenge|friction|strain\b/.test(context.normalized);

  if (hasExplicitResistance || hasImplicitResistance) {
    return buildCriterionAssessment(
      "covered",
      "The answer shows a real opposing constraint, stakeholder concern, or resistance to work through.",
      evidence,
      policy?.strictnessNote,
    );
  }

  if (hasWeakResistance) {
    return buildCriterionAssessment(
      "weak",
      "The answer implies tension, but it does not fully show the resistance that had to be resolved.",
      evidence,
      policy?.strictnessNote,
    );
  }

  return buildCriterionAssessment(
    "missing",
    "The answer does not show any real pushback, resistance, or opposing constraint.",
    null,
    policy?.strictnessNote,
  );
}

function assessStrategicLayer(context: AssessmentContext) {
  const policy = getCriterionPolicy(context.questionCode, "strategic_layer");
  const evidence = findEvidence(context.sentences, (sentence) => {
    const lowered = sentence.toLowerCase();
    return strategicPattern.test(lowered) || containsAny(lowered, policy?.covered);
  });
  const hasStrategicLayer =
    strategicPattern.test(context.normalized) || containsAny(context.normalized, policy?.covered);
  const hasWeakStrategicLayer = /\bteam|customer|business\b/.test(context.normalized);

  if (hasStrategicLayer) {
    return buildCriterionAssessment(
      "covered",
      "The answer connects the work to wider team, customer, or business impact.",
      evidence,
      policy?.strictnessNote,
    );
  }

  if (hasWeakStrategicLayer) {
    return buildCriterionAssessment(
      "weak",
      "The answer gestures at broader impact, but it does not really connect the story to the wider context.",
      evidence,
      policy?.strictnessNote,
    );
  }

  return buildCriterionAssessment(
    "missing",
    "The answer does not connect the work to a wider team, customer, or business effect.",
    null,
    policy?.strictnessNote,
  );
}

function applyShortAnswerFloor(
  assessment: CriterionAssessmentMap,
  wordCount: number,
) {
  if (wordCount >= 30) {
    return assessment;
  }

  return criteriaOrder.reduce<CriterionAssessmentMap>((accumulator, criterion) => {
    const current = assessment[criterion];
    accumulator[criterion] =
      current.status === "covered"
        ? buildCriterionAssessment(
            "weak",
            "The answer is too short for this point to count as fully covered yet.",
            current.evidence,
            current.strictnessNote,
          )
        : current;
    return accumulator;
  }, {} as CriterionAssessmentMap);
}

function buildCriterionAssessment(
  status: CriterionAssessmentStatus,
  reason: string,
  evidence: string | null,
  strictnessNote?: string | null,
): CriterionAssessment {
  return {
    status,
    reason,
    evidence: evidence?.trim() || null,
    strictnessNote: strictnessNote?.trim() || null,
    qualityScore: toQualityScore(status),
  };
}

function buildStarSectionAssessment(
  status: StarSectionStatus,
  reason: string,
  evidence: string | null,
  strictnessNote?: string | null,
): StarSectionAssessment {
  return {
    status,
    reason,
    evidence: evidence?.trim() || null,
    strictnessNote: strictnessNote?.trim() || null,
    qualityScore: toQualityScore(status),
  };
}

function toQualityScore(status: CriterionAssessmentStatus): 0 | 1 | 2 {
  switch (status) {
    case "covered":
      return 2;
    case "weak":
      return 1;
    default:
      return 0;
  }
}

function toStarAssessment(
  criterionAssessment: CriterionAssessmentMap,
): Record<StarSection, StarSectionAssessment> {
  return starSections.reduce<Record<StarSection, StarSectionAssessment>>((accumulator, section) => {
    const item = criterionAssessment[section];
    accumulator[section] = buildStarSectionAssessment(
      item.status,
      item.reason,
      item.evidence,
      item.strictnessNote,
    );
    return accumulator;
  }, {} as Record<StarSection, StarSectionAssessment>);
}

function toStarCoverage(
  starAssessment: Record<StarSection, StarSectionAssessment>,
): StarCoverage {
  return starSections.reduce<StarCoverage>(
    (accumulator, section) => {
      accumulator[section] = starAssessment[section].status;
      return accumulator;
    },
    {
      situation: "missing",
      task: "missing",
      action: "missing",
      result: "missing",
    },
  );
}

function resolveCriterionAssessment(evaluation: EvaluationResult) {
  return evaluation.criterionAssessment ?? toCriterionAssessmentFromMissing(evaluation.missingComponents, evaluation.starAssessment);
}

function getStarSectionsByStatus(
  starAssessment: Record<StarSection, StarSectionAssessment>,
  status: StarSectionStatus,
) {
  return starSections.filter((section) => starAssessment[section].status === status);
}

function getRelevantCriteria(
  questionCode: QuestionCode,
  requiredCriteria?: MissingComponent[],
) {
  const relevant = new Set<MissingComponent>(requiredCriteria ?? []);

  if (relevant.size === 0) {
    relevant.add("situation");
    if (questionCode !== "Q10") relevant.add("task");
    relevant.add("action");
    relevant.add("result");
  }

  if (["Q1", "Q4", "Q10"].includes(questionCode)) {
    relevant.add("strategic_layer");
  }

  return criteriaOrder.filter((criterion) => relevant.has(criterion));
}

function buildCriterionSuggestion(
  criterion: MissingComponent,
  status: CriterionAssessmentStatus,
) {
  const weak = status === "weak";

  switch (criterion) {
    case "result":
      return weak
        ? "You implied an outcome, but not clearly enough to prove impact."
        : "State the result and what changed because of your work.";
    case "action":
      return weak
        ? "You named your role, but not enough of what you actually did."
        : "Spend more time on the actions you took.";
    case "task":
      return weak
        ? "You hinted at your ownership, but your responsibility is still too vague."
        : "Say what you were personally responsible for.";
    case "situation":
      return weak
        ? "You hinted at the context, but the challenge still is not concrete."
        : "Open with the situation so the challenge feels real.";
    case "metric":
      return weak
        ? "You suggested impact, but add a metric or before-and-after to prove it."
        : "Add a measurable outcome or a before-and-after indicator.";
    case "ownership":
      return weak
        ? "Make your personal ownership sharper so it is unmistakably yours."
        : "Make your own contribution unmistakably clear.";
    case "reflection":
      return weak
        ? "Your lesson is there, but make it more specific and transferable."
        : "Close with what you learned or would repeat next time.";
    case "tradeoff":
      return weak
        ? "You described the choice, but make the trade-off behind it explicit."
        : "Explain the trade-off you had to navigate.";
    case "resistance":
      return weak
        ? "The tension is there, but make the pushback or friction more explicit."
        : "Show the resistance or pushback you had to work through.";
    case "strategic_layer":
      return weak
        ? "Connect the example more clearly to the broader team or business effect."
        : "Connect the story to the broader team or business impact.";
    default:
      return "Add more concrete detail.";
  }
}

function formatCriterionForHeadline(criterion: MissingComponent) {
  switch (criterion) {
    case "strategic_layer":
      return "broader business impact";
    default:
      return criterion.replaceAll("_", " ");
  }
}

function formatCriterionForExplanation(criterion: MissingComponent) {
  switch (criterion) {
    case "strategic_layer":
      return "the broader business impact";
    case "tradeoff":
      return "the trade-off";
    default:
      return `the ${criterion.replaceAll("_", " ")}`;
  }
}

function containsAny(text: string, patterns?: RegExp[]) {
  if (!patterns || patterns.length === 0) {
    return false;
  }

  return patterns.some((pattern) => pattern.test(text));
}

function hasOwnershipAnchor(text: string) {
  return ownershipAnchorPattern.test(text) || strongTaskPattern.test(text);
}

function countFirstPersonStatements(text: string) {
  return text.match(/\bi\b/g)?.length ?? 0;
}

function findEvidence(
  sentences: string[],
  predicate: (sentence: string) => boolean,
) {
  return sentences.find((sentence) => predicate(sentence)) ?? null;
}

function stripTrailingPeriod(value: string) {
  return value.replace(/[.!\s]+$/g, "");
}

function roundScore(value: number) {
  return Math.round(value * 10) / 10;
}

export function roundWeightedScore(value: number) {
  return roundScore(value);
}

function normalizeTopScore(
  score: 1 | 2 | 3 | 4 | 5,
  missing: MissingComponent[],
): 1 | 2 | 3 | 4 | 5 {
  if (missing.length === 0) {
    return score;
  }

  return Math.min(score, 4) as 1 | 2 | 3 | 4 | 5;
}

function toCriterionAssessmentFromMissing(
  missingComponents: MissingComponent[],
  starAssessment?: Partial<Record<StarSection, StarSectionAssessment>>,
): CriterionAssessmentMap {
  const missing = new Set(missingComponents);

  return criteriaOrder.reduce<CriterionAssessmentMap>((accumulator, criterion) => {
    if (criterion in (starAssessment ?? {})) {
      const starCriterion = criterion as StarSection;
      const candidate = starAssessment?.[starCriterion];
      if (candidate) {
        accumulator[criterion] = {
          status: candidate.status,
          reason: candidate.reason,
          evidence: candidate.evidence,
          strictnessNote: candidate.strictnessNote ?? null,
          qualityScore: candidate.qualityScore,
        };
        return accumulator;
      }
    }

    accumulator[criterion] = buildCriterionAssessment(
      missing.has(criterion) ? "missing" : "covered",
      missing.has(criterion)
        ? `The answer does not yet satisfy the ${criterion.replaceAll("_", " ")} criterion.`
        : `The answer appears to satisfy the ${criterion.replaceAll("_", " ")} criterion.`,
      null,
    );
    return accumulator;
  }, {} as CriterionAssessmentMap);
}

export function summarizeImprovementScores(values: number[]) {
  return roundScore(average(values));
}
