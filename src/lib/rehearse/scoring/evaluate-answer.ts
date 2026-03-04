import type {
  AttemptFeedback,
  EvaluationInput,
  EvaluationResult,
  MissingComponent,
  ScoreCap,
  StarCoverage,
  StarSection,
  StarSectionAssessment,
  StarSectionStatus,
} from "@/types/rehearse";
import { average, clamp } from "@/lib/utils";
import { scoreDelivery } from "@/lib/rehearse/delivery/metrics";
import { buildNudge } from "@/lib/rehearse/nudges/generate-nudge";

const starSections: StarSection[] = ["situation", "task", "action", "result"];
const specificActionVerbs = [
  "built",
  "created",
  "aligned",
  "designed",
  "implemented",
  "prioritized",
  "spoke",
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
const situationContextPattern =
  /\bwhen|while|during|at the time|in my role|working on|our team|the team|project|launch|migration|incident|rollout\b/;
const situationChallengePattern =
  /\bchallenge|challenging|problem|issue|constraint|deadline|behind|blocked|pressure|ambigu|uncertain|risk|delay|outage|conflict|backlog|shortage|complex|scope\b/;
const strongTaskPattern =
  /\bmy goal was|i needed to|i was responsible for|the task was|i had to|i owned|i was accountable for|my remit was|i was asked to\b/;
const weakTaskPattern =
  /\bgoal|responsible|task|objective|ownership|accountable|needed to|had to\b/;
const actionSpecificPattern = new RegExp(`\\bi\\b[^.!?\\n]{0,160}\\b(${specificActionVerbs.join("|")})\\b`);
const actionGenericPattern = new RegExp(`\\bi\\b[^.!?\\n]{0,160}\\b(${genericActionVerbs.join("|")})\\b`);
const actionDetailPattern =
  /\b(first|second|third|by|through|using|with|across|daily|weekly|timeline|plan|checklist|workstream|stakeholder|stakeholders|engineering|product|support|vendor|compliance|experiment|analysis|critical path|decision|trade-off|feature|metric|review|checkpoint)\b/;
const resultOutcomePattern =
  /\b(as a result|result|outcome|led to|reduced|improved|increased|decreased|grew|launched|delivered|cut|raised|lowered|prevented|saved|on time|rolled out)\b/;
const resultProofPattern =
  /\b(we knew|measured|tracked|saw|within|from\b.+\bto|customer|customers|adoption|retention|escalations|sla|complaints|tickets|conversion|activation|feedback|survey|renewal|retained|continued to use|adopted|usage)\b/;
const genericResultPattern = /\b(solved|fixed|worked|successful|success|better)\b/;

export function evaluateAnswerHeuristically(input: EvaluationInput): {
  evaluation: EvaluationResult;
  feedback: AttemptFeedback;
} {
  const transcript = input.transcript.trim();
  const normalized = transcript.toLowerCase();
  const deliveryScore = scoreDelivery(input.deliveryMetrics);
  const starAssessment = assessStarSections(transcript, input.question.code);
  const missing = detectMissingComponents(normalized, input.question.code, starAssessment);
  const strengths = detectStrengths(normalized, input.question.code, input.cvSummary, starAssessment);
  const rawScore = scoreContent(missing, normalized, starAssessment);
  const capsApplied = detectCaps(input, missing, normalized);
  const cappedScore = normalizeTopScore(applyCaps(rawScore, capsApplied), missing);
  const weightedContentScore = roundScore(cappedScore * input.seniorityMultiplier);
  const weightedContentMax = roundScore(5 * input.seniorityMultiplier);

  const evaluation: EvaluationResult = {
    contentScoreRaw: rawScore,
    finalContentScoreAfterCaps: cappedScore,
    weightedContentScore,
    weightedContentMax,
    deliveryScore,
    starAssessment,
    missingComponents: missing,
    strengths,
    nudges: missing.length > 0 ? [buildNudge(input.question, strengths, missing)] : [],
    capsApplied,
    contentReasoning: {
      structure: describeStructure(starAssessment),
      ownership: missing.includes("ownership")
        ? "Ownership is not yet explicit enough."
        : "Ownership is explicit and credible.",
      metrics: missing.includes("metric")
        ? "The answer lacks quantified impact."
        : "The answer includes measurable impact.",
      tradeoffs: missing.includes("tradeoff")
        ? "Trade-offs are implied but not explicit."
        : "Trade-offs are articulated clearly.",
      reflection: missing.includes("reflection")
        ? "Reflection is limited or absent."
        : "Reflection shows learning and transferability.",
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

export function assessStarSections(
  transcript: string,
  _questionCode: string,
): Record<StarSection, StarSectionAssessment> {
  const source = transcript.trim();
  const normalized = source.toLowerCase();
  const sentences = splitIntoSentences(source);
  const assessment = {
    situation: assessSituation(normalized, sentences),
    task: assessTask(normalized, sentences),
    action: assessAction(normalized, sentences),
    result: assessResult(normalized, sentences),
  } satisfies Record<StarSection, StarSectionAssessment>;

  return applyShortAnswerFloor(assessment, normalized);
}

export function detectMissingComponents(
  normalized: string,
  questionCode: string,
  starAssessment = assessStarSections(normalized, questionCode),
): MissingComponent[] {
  const missing = deriveMissingComponents(starAssessment, questionCode);

  if (!hasMetric(normalized)) missing.push("metric");
  if (!hasOwnership(normalized)) missing.push("ownership");
  if (!hasReflection(normalized) && questionCode !== "Q10") missing.push("reflection");
  if (!hasTradeoff(normalized) && ["Q1", "Q4", "Q6", "Q8", "Q10"].includes(questionCode)) {
    missing.push("tradeoff");
  }
  if (!hasResistance(normalized) && ["Q2", "Q4"].includes(questionCode)) {
    missing.push("resistance");
  }
  if (!hasStrategicLayer(normalized) && ["Q1", "Q4", "Q10"].includes(questionCode)) {
    missing.push("strategic_layer");
  }

  return Array.from(new Set(missing));
}

export function deriveMissingComponents(
  starAssessment: Record<StarSection, StarSectionAssessment>,
  questionCode: string,
): MissingComponent[] {
  const missing: MissingComponent[] = [];

  if (starAssessment.situation.status === "missing") missing.push("situation");
  if (starAssessment.task.status === "missing" && questionCode !== "Q10") missing.push("task");
  if (starAssessment.action.status === "missing") missing.push("action");
  if (starAssessment.result.status === "missing") missing.push("result");

  return missing;
}

export function normalizeStarAssessment(
  candidate: Record<StarSection, StarSectionAssessment> | undefined,
  transcript: string,
  questionCode: string,
): Record<StarSection, StarSectionAssessment> {
  const heuristic = assessStarSections(transcript, questionCode);
  if (!candidate) {
    return heuristic;
  }

  return starSections.reduce<Record<StarSection, StarSectionAssessment>>((accumulator, section) => {
    const parsed = candidate[section];
    const fallback = heuristic[section];
    const parsedStatus = parsed?.status ?? fallback.status;
    const verified =
      parsedStatus === "covered" && fallback.status !== "covered"
        ? buildStarSectionAssessment(
            "weak",
            fallback.reason,
            parsed?.evidence?.trim() || fallback.evidence,
          )
        : buildStarSectionAssessment(
            parsedStatus,
            parsed?.reason?.trim() || fallback.reason,
            parsed?.evidence?.trim() || fallback.evidence,
          );

    accumulator[section] = verified;
    return accumulator;
  }, {} as Record<StarSection, StarSectionAssessment>);
}

function detectStrengths(
  normalized: string,
  questionCode: string,
  cvSummary?: EvaluationInput["cvSummary"],
  starAssessment?: Record<StarSection, StarSectionAssessment>,
) {
  const strengths: string[] = [];

  if (starAssessment && starSections.every((section) => starAssessment[section].status === "covered")) {
    strengths.push("clear STAR structure");
  }
  if (hasOwnership(normalized)) strengths.push("explicit ownership");
  if (hasMetric(normalized)) strengths.push("quantified impact");
  if (hasTradeoff(normalized)) strengths.push("trade-off clarity");
  if (hasReflection(normalized) && questionCode !== "Q10") strengths.push("useful reflection");
  if (hasStrategicLayer(normalized)) strengths.push("broader strategic framing");
  if ((cvSummary?.quantifiedAchievements?.length ?? 0) > 0) {
    strengths.push("room to anchor the answer in a real CV achievement");
  }

  return strengths.slice(0, 4);
}

function scoreContent(
  missing: MissingComponent[],
  normalized: string,
  starAssessment: Record<StarSection, StarSectionAssessment>,
): 1 | 2 | 3 | 4 | 5 {
  const starQualityTotal = starSections.reduce(
    (sum, section) => sum + starAssessment[section].qualityScore,
    0,
  );
  const nonStarMissingCount = missing.filter(
    (component) => !starSections.includes(component as StarSection),
  ).length;
  const conciseBonus = normalized.split(/\s+/).length <= 260 ? 0.5 : 0;
  const score = starQualityTotal - nonStarMissingCount + conciseBonus;

  if (score < 2.5) return 1;
  if (score < 4.5) return 2;
  if (score < 6.25) return 3;
  if (score < 7.5) return 4;
  return 5;
}

export function detectCaps(
  input: EvaluationInput,
  missing: MissingComponent[],
  normalized: string,
) {
  const caps: ScoreCap[] = [];

  if (missing.includes("result")) caps.push("no_result");
  if (missing.includes("ownership")) caps.push("no_ownership");
  if (missing.includes("metric")) caps.push("no_metric");
  if (missing.includes("reflection") && input.question.code !== "Q10") {
    caps.push("no_reflection");
  }

  const seniorityNeedsTradeoff =
    input.seniorityLevel === "senior" ||
    input.seniorityLevel === "lead_principal" ||
    input.seniorityLevel === "manager_director";

  if (seniorityNeedsTradeoff && missing.includes("tradeoff")) {
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
  const headline = buildHeadline(evaluation);
  const deliverySummary = buildDeliverySummary(evaluation);
  const retryPrompt = buildRetryPrompt(evaluation, improveNext);
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
    strengths,
    improveNext,
    deliverySummary,
    retryPrompt,
    starCoverage: toStarCoverage(evaluation.starAssessment),
    missingElements,
    answerStarter,
    cvLeverage: leverage.length > 0 ? leverage : undefined,
    roleRelevance,
    spokenRecap: buildSpokenRecap(headline, improveNext, roleRelevance),
  };
}

function describeVerdict(score: EvaluationResult["finalContentScoreAfterCaps"]) {
  if (score >= 4) {
    return "Strong answer";
  }
  if (score === 3) {
    return "Solid foundation";
  }
  return "Needs more detail";
}

function buildHeadline(evaluation: EvaluationResult) {
  const resultStatus = evaluation.starAssessment.result.status;
  const actionStatus = evaluation.starAssessment.action.status;
  const situationStatus = evaluation.starAssessment.situation.status;
  const allCovered = starSections.every(
    (section) => evaluation.starAssessment[section].status === "covered",
  );

  if (evaluation.finalContentScoreAfterCaps >= 4 && allCovered) {
    return "This answer lands well and feels interview-ready.";
  }
  if (resultStatus === "missing") {
    return "The story needs a clearer result so the answer actually lands.";
  }
  if (resultStatus === "weak") {
    return "You hinted at the outcome, but it still does not prove what changed.";
  }
  if (actionStatus === "missing") {
    return "I can tell what the project was, but not enough about what you actually did.";
  }
  if (actionStatus === "weak") {
    return "You named your role, but not enough of what you actually did.";
  }
  if (situationStatus === "missing") {
    return "The answer starts too abruptly and needs more setup.";
  }
  if (situationStatus === "weak") {
    return "You hinted at the context, but the challenge still is not concrete.";
  }
  return "There is a good answer here, but it still feels too thin to be convincing.";
}

function buildImproveNext(
  evaluation: EvaluationResult,
  input: EvaluationInput,
) {
  const missingStarSuggestions = getStarSectionsByStatus(evaluation.starAssessment, "missing").map(
    toMissingStarSuggestion,
  );
  const weakStarSuggestions = getStarSectionsByStatus(evaluation.starAssessment, "weak").map(
    toWeakStarSuggestion,
  );
  const nonStarSuggestions = evaluation.missingComponents
    .filter((component) => !starSections.includes(component as StarSection))
    .map((component) => {
      switch (component) {
        case "metric":
          return "Add a measurable outcome or a before-and-after indicator.";
        case "ownership":
          return "Make your own contribution unmistakably clear.";
        case "reflection":
          return "Close with what you learned or would repeat next time.";
        case "tradeoff":
          return "Explain the trade-off you had to navigate.";
        case "resistance":
          return "Show the resistance or pushback you had to work through.";
        case "strategic_layer":
          return "Connect the story to the broader team or business impact.";
        default:
          return "Add more concrete detail.";
      }
    });
  const suggestions = [
    ...missingStarSuggestions,
    ...weakStarSuggestions,
    ...nonStarSuggestions,
    ...buildDeliveryImproveNext(input),
  ];

  const unique = Array.from(new Set(suggestions));
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
  improveNext: string[],
) {
  if (improveNext.length === 0) {
    return "Try again with the same structure and make the final impact even more concrete.";
  }

  if (evaluation.starAssessment.result.status === "missing") {
    return "Try again and make the result and what changed because of your work unmistakably clear.";
  }

  if (evaluation.starAssessment.result.status === "weak") {
    return "Try again and make the outcome concrete enough to prove that it worked.";
  }

  if (evaluation.starAssessment.action.status === "missing") {
    return "Try again and spend more time on the actions you personally drove.";
  }

  if (evaluation.starAssessment.action.status === "weak") {
    return "Try again and add the decisions and execution detail behind your actions.";
  }

  if (evaluation.starAssessment.situation.status !== "covered") {
    return "Try again and anchor the answer in the situation before you move into the action.";
  }

  return `Try again and focus on this next: ${improveNext[0]}`;
}

function buildSpokenRecap(
  headline: string,
  improveNext: string[],
  roleRelevance?: AttemptFeedback["roleRelevance"],
) {
  if (improveNext.length === 0 && !roleRelevance) {
    return "Strong answer. Keep that structure and sharpen the delivery.";
  }

  const coachingLine =
    improveNext.length > 0
      ? `Improve next: ${improveNext.map(stripTrailingPeriod).join("; ")}.`
      : "";
  const relevanceLine = roleRelevance
    ? `Role relevance: ${roleRelevance.headline} ${roleRelevance.bridge ?? roleRelevance.detail}`
    : "";

  return [headline, coachingLine, relevanceLine].filter(Boolean).join(" ").trim();
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

function stripTrailingPeriod(value: string) {
  return value.replace(/[.!\s]+$/g, "");
}

function buildDeliverySummary(evaluation: EvaluationResult) {
  return [
    evaluation.deliveryReasoning.clarity,
    evaluation.deliveryReasoning.pacing,
    evaluation.deliveryReasoning.fillerAssessment,
    evaluation.deliveryReasoning.conciseness,
  ].join(" ");
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
  questionCode: string,
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
  const union = new Set([
    ...Array.from(leftTokens),
    ...Array.from(rightTokens),
  ]);
  return union.size === 0 ? 0 : shared.length / union.size;
}

function hasMetric(text: string) {
  return /\b\d+(\.\d+)?\s?(%|x|hours|days|weeks|months|people|customers|tickets|points)\b|\$\d+|\b\d+\b/.test(
    text,
  );
}

function hasOwnership(text: string) {
  const iStatements = text.match(/\bi\b/g)?.length ?? 0;
  const weStatements = text.match(/\bwe\b/g)?.length ?? 0;
  return iStatements > 1 && iStatements >= weStatements;
}

function hasReflection(text: string) {
  return /\b(i learned|i would|next time|if i did it again|that taught me|lesson)\b/.test(
    text,
  );
}

function hasTradeoff(text: string) {
  return /\btrade[- ]?off|instead of|versus|vs\.?|priority was|balanced|because we chose\b/.test(
    text,
  );
}

function hasResistance(text: string) {
  return /\bpushback|resistance|objection|disagreed|conflict|skeptical|concerned\b/.test(
    text,
  );
}

function hasStrategicLayer(text: string) {
  return /\bcompany|organization|org|team-wide|roadmap|business|customer|executive|system\b/.test(
    text,
  );
}

function splitIntoSentences(text: string) {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function assessSituation(normalized: string, sentences: string[]) {
  const evidence = findEvidence(sentences, (sentence) => {
    const lowered = sentence.toLowerCase();
    return situationContextPattern.test(lowered) || situationChallengePattern.test(lowered);
  });
  const hasContext = situationContextPattern.test(normalized);
  const hasChallenge = situationChallengePattern.test(normalized);

  if (hasContext && hasChallenge) {
    return buildStarSectionAssessment(
      "covered",
      "The answer sets up both the context and the challenge clearly enough to anchor the story.",
      evidence,
    );
  }

  if (hasContext || hasChallenge) {
    return buildStarSectionAssessment(
      "weak",
      "You hinted at the context, but the challenge still is not concrete.",
      evidence,
    );
  }

  return buildStarSectionAssessment(
    "missing",
    "The answer never sets up the situation or why it was challenging.",
    null,
  );
}

function assessTask(normalized: string, sentences: string[]) {
  const evidence = findEvidence(sentences, (sentence) => {
    const lowered = sentence.toLowerCase();
    return strongTaskPattern.test(lowered) || weakTaskPattern.test(lowered);
  });

  if (strongTaskPattern.test(normalized)) {
    return buildStarSectionAssessment(
      "covered",
      "The answer states the speaker's goal or responsibility explicitly.",
      evidence,
    );
  }

  if (weakTaskPattern.test(normalized)) {
    return buildStarSectionAssessment(
      "weak",
      "The answer gestures at ownership, but it does not clearly state the speaker's responsibility.",
      evidence,
    );
  }

  return buildStarSectionAssessment(
    "missing",
    "The answer never states what the speaker was personally responsible for.",
    null,
  );
}

function assessAction(normalized: string, sentences: string[]) {
  const evidence = findEvidence(sentences, (sentence) => {
    const lowered = sentence.toLowerCase();
    return actionSpecificPattern.test(lowered) || actionGenericPattern.test(lowered);
  });
  const hasSpecificAction = actionSpecificPattern.test(normalized);
  const hasGenericAction = actionGenericPattern.test(normalized);
  const hasActionDetail = actionDetailPattern.test(normalized);
  const specificSentenceCount = sentences.filter((sentence) =>
    actionSpecificPattern.test(sentence.toLowerCase()),
  ).length;

  if (
    (hasSpecificAction && (hasActionDetail || specificSentenceCount >= 2)) ||
    (hasGenericAction && hasActionDetail)
  ) {
    return buildStarSectionAssessment(
      "covered",
      "The answer explains concrete actions, not just a generic claim of leadership or support.",
      evidence,
    );
  }

  if (hasSpecificAction || hasGenericAction) {
    return buildStarSectionAssessment(
      "weak",
      "You named your role, but not enough of what you actually did.",
      evidence,
    );
  }

  return buildStarSectionAssessment(
    "missing",
    "The answer does not explain the actions the speaker took.",
    null,
  );
}

function assessResult(normalized: string, sentences: string[]) {
  const evidence = findEvidence(sentences, (sentence) => {
    const lowered = sentence.toLowerCase();
    return (
      resultOutcomePattern.test(lowered) ||
      resultProofPattern.test(lowered) ||
      genericResultPattern.test(lowered)
    );
  });
  const hasOutcome = resultOutcomePattern.test(normalized);
  const hasProof = hasMetric(normalized) || resultProofPattern.test(normalized);

  if (hasOutcome && hasProof) {
    return buildStarSectionAssessment(
      "covered",
      "The answer makes the outcome concrete and explains how success showed up.",
      evidence,
    );
  }

  if (hasOutcome || genericResultPattern.test(normalized)) {
    return buildStarSectionAssessment(
      "weak",
      "You implied an outcome, but not clearly enough to prove impact.",
      evidence,
    );
  }

  return buildStarSectionAssessment(
    "missing",
    "The answer never lands on what changed or how success was known.",
    null,
  );
}

function applyShortAnswerFloor(
  starAssessment: Record<StarSection, StarSectionAssessment>,
  normalized: string,
) {
  const wordCount = normalized.split(/\s+/).filter(Boolean).length;
  if (wordCount >= 30) {
    return starAssessment;
  }

  return starSections.reduce<Record<StarSection, StarSectionAssessment>>((accumulator, section) => {
    const current = starAssessment[section];
    accumulator[section] =
      current.status === "covered"
        ? buildStarSectionAssessment(
            "weak",
            "The answer is too short for this section to count as fully covered yet.",
            current.evidence,
          )
        : current;
    return accumulator;
  }, {} as Record<StarSection, StarSectionAssessment>);
}

function buildStarSectionAssessment(
  status: StarSectionStatus,
  reason: string,
  evidence: string | null,
): StarSectionAssessment {
  return {
    status,
    reason,
    evidence: evidence?.trim() || null,
    qualityScore: toQualityScore(status),
  };
}

function toQualityScore(status: StarSectionStatus): 0 | 1 | 2 {
  switch (status) {
    case "covered":
      return 2;
    case "weak":
      return 1;
    default:
      return 0;
  }
}

function toStarCoverage(
  starAssessment: Record<StarSection, StarSectionAssessment>,
): StarCoverage {
  return starSections.reduce<StarCoverage>((accumulator, section) => {
    accumulator[section] = starAssessment[section].status;
    return accumulator;
  }, {
    situation: "missing",
    task: "missing",
    action: "missing",
    result: "missing",
  });
}

function getStarSectionsByStatus(
  starAssessment: Record<StarSection, StarSectionAssessment>,
  status: StarSectionStatus,
) {
  return starSections.filter((section) => starAssessment[section].status === status);
}

function toMissingStarSuggestion(section: StarSection) {
  switch (section) {
    case "result":
      return "State the result and what changed because of your work.";
    case "action":
      return "Spend more time on the actions you took.";
    case "task":
      return "Say what you were personally responsible for.";
    case "situation":
      return "Open with the situation so the challenge feels real.";
    default:
      return "Add more concrete detail.";
  }
}

function toWeakStarSuggestion(section: StarSection) {
  switch (section) {
    case "result":
      return "You implied an outcome, but not clearly enough to prove impact.";
    case "action":
      return "You named your role, but not enough of what you actually did.";
    case "task":
      return "You hinted at your ownership, but your responsibility is still too vague.";
    case "situation":
      return "You hinted at the context, but the challenge still is not concrete.";
    default:
      return "Add more concrete detail.";
  }
}

function findEvidence(
  sentences: string[],
  predicate: (sentence: string) => boolean,
) {
  return sentences.find((sentence) => predicate(sentence)) ?? null;
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

export function summarizeImprovementScores(values: number[]) {
  return roundScore(average(values));
}
