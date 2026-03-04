import type {
  AttemptFeedback,
  EvaluationInput,
  EvaluationResult,
  MissingComponent,
  ScoreCap,
} from "@/types/rehearse";
import { average, clamp } from "@/lib/utils";
import { scoreDelivery } from "@/lib/rehearse/delivery/metrics";
import { buildNudge } from "@/lib/rehearse/nudges/generate-nudge";

export function evaluateAnswerHeuristically(input: EvaluationInput): {
  evaluation: EvaluationResult;
  feedback: AttemptFeedback;
} {
  const transcript = input.transcript.trim();
  const normalized = transcript.toLowerCase();
  const deliveryScore = scoreDelivery(input.deliveryMetrics);
  const missing = detectMissingComponents(normalized, input.question.code);
  const strengths = detectStrengths(normalized, input.question.code, input.cvSummary);
  const rawScore = scoreContent(missing, normalized);
  const capsApplied = detectCaps(input, missing, normalized);
  const cappedScore = normalizeTopScore(applyCaps(rawScore, capsApplied), missing);
  const weightedContentScore = roundScore(
    cappedScore * input.seniorityMultiplier,
  );
  const weightedContentMax = roundScore(5 * input.seniorityMultiplier);

  const evaluation: EvaluationResult = {
    contentScoreRaw: rawScore,
    finalContentScoreAfterCaps: cappedScore,
    weightedContentScore,
    weightedContentMax,
    deliveryScore,
    missingComponents: missing,
    strengths,
    nudges: missing.length > 0 ? [buildNudge(input.question, strengths, missing)] : [],
    capsApplied,
    contentReasoning: {
      structure: describeStructure(missing),
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

export function detectMissingComponents(
  normalized: string,
  questionCode: string,
): MissingComponent[] {
  const missing: MissingComponent[] = [];

  if (!hasSituation(normalized)) missing.push("situation");
  if (!hasTask(normalized) && questionCode !== "Q10") missing.push("task");
  if (!hasAction(normalized)) missing.push("action");
  if (!hasResult(normalized)) missing.push("result");
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

function detectStrengths(
  normalized: string,
  questionCode: string,
  cvSummary?: EvaluationInput["cvSummary"],
) {
  const strengths: string[] = [];

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
): 1 | 2 | 3 | 4 | 5 {
  const presenceScore = 10 - missing.length;
  const conciseBonus = normalized.split(/\s+/).length <= 260 ? 0.5 : 0;
  const score = presenceScore / 2 + conciseBonus;

  if (score < 2.6) return 1;
  if (score < 3.6) return 2;
  if (score < 4.4) return 3;
  if (score < 4.9) return 4;
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
  const answerStarter = buildAnswerStarter(evaluation.missingComponents, input.question.code);
  const missingElements = evaluation.missingComponents.map(formatMissingComponent);
  const roleRelevance = buildRoleRelevanceFeedback(evaluation.roleRelevance);

  return {
    verdict,
    headline,
    strengths,
    improveNext,
    deliverySummary,
    retryPrompt,
    starCoverage: {
      situation: !evaluation.missingComponents.includes("situation"),
      task: !evaluation.missingComponents.includes("task"),
      action: !evaluation.missingComponents.includes("action"),
      result: !evaluation.missingComponents.includes("result"),
    },
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
  if (evaluation.finalContentScoreAfterCaps >= 4) {
    return "This answer lands well and feels interview-ready.";
  }
  if (evaluation.missingComponents.includes("result")) {
    return "The story needs a clearer result so the answer actually lands.";
  }
  if (evaluation.missingComponents.includes("action")) {
    return "I can tell what the project was, but not enough about what you actually did.";
  }
  if (evaluation.missingComponents.includes("situation")) {
    return "The answer starts too abruptly and needs more setup.";
  }
  return "There is a good answer here, but it still feels too thin to be convincing.";
}

function buildImproveNext(
  evaluation: EvaluationResult,
  input: EvaluationInput,
) {
  const suggestions = [
    ...evaluation.missingComponents.map((component) => {
      switch (component) {
        case "result":
          return "State the result and what changed because of your work.";
        case "metric":
          return "Add a measurable outcome or a before-and-after indicator.";
        case "ownership":
          return "Make your own contribution unmistakably clear.";
        case "situation":
          return "Open with the situation so the challenge feels real.";
        case "task":
          return "Say what you were personally responsible for.";
        case "action":
          return "Spend more time on the actions you took.";
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
    }),
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

  if (evaluation.missingComponents.includes("result")) {
    return "Try again and make the result and what changed because of your work unmistakably clear.";
  }

  if (evaluation.missingComponents.includes("action")) {
    return "Try again and spend more time on the actions you personally drove.";
  }

  if (evaluation.missingComponents.includes("situation")) {
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

function buildAnswerStarter(missing: MissingComponent[], questionCode: string) {
  if (missing.length === 0) {
    return "Start with one sentence of context, spend most of the answer on your actions, and close on the result.";
  }

  if (missing.includes("situation") || missing.includes("task")) {
    return questionCode === "Q10"
      ? "Open with the strongest reason you match this role, then support it with evidence."
      : "Start with: In my role, I was responsible for..., and the challenge was...";
  }

  if (missing.includes("action")) {
    return "Then continue with: I focused on three things. First..., second..., and third...";
  }

  if (missing.includes("result") || missing.includes("metric")) {
    return "Close with: As a result, we changed X to Y, which meant...";
  }

  return "Reshape the answer into context, your actions, and the result you produced.";
}

function toCandidateStrength(value: string) {
  switch (value) {
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

function describeStructure(missing: MissingComponent[]) {
  const starCoverage = ["situation", "task", "action", "result"].filter(
    (item) => !missing.includes(item as MissingComponent),
  );
  if (starCoverage.length === 4) {
    return "The answer follows a recognizable STAR flow.";
  }
  if (starCoverage.length >= 2) {
    return "The answer has partial STAR structure but still leaves gaps.";
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

function hasSituation(text: string) {
  return /\bwhen|at the time|in my role|while working on|during\b/.test(text);
}

function hasTask(text: string) {
  return /\bmy goal|i needed to|i was responsible|the task was|i had to\b/.test(text);
}

function hasAction(text: string) {
  return /\bi (built|created|led|drove|aligned|designed|implemented|prioritized|spoke|decided|launched|changed|introduced)\b/.test(
    text,
  );
}

function hasResult(text: string) {
  return /\b(result|outcome|as a result|led to|reduced|improved|increased|decreased|delivered)\b/.test(
    text,
  );
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
