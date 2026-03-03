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

  return {
    strengths: evaluation.strengths,
    missingElements: evaluation.missingComponents.map((component) =>
      component.replaceAll("_", " "),
    ),
    whatWouldElevateToFive:
      evaluation.missingComponents.length === 0
        ? "Keep the same structure and tighten delivery to land even more cleanly."
        : `Add ${evaluation.missingComponents
            .slice(0, 3)
            .map((item) => item.replaceAll("_", " "))
            .join(", ")} to close the rubric gaps.`,
    structuralImprovement:
      "Lead with the situation and task in one sentence each, spend most of the answer on your actions, and close with a metric-backed result plus reflection.",
    cvLeverage: leverage.length > 0 ? leverage : undefined,
    spokenText:
      evaluation.nudges[0] ??
      `Final score recorded. Content ${evaluation.finalContentScoreAfterCaps} out of 5, delivery ${evaluation.deliveryScore} out of 5.`,
  };
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
