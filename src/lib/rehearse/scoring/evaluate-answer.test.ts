import { describe, expect, it } from "vitest";
import { computeDeliveryMetrics } from "@/lib/rehearse/delivery/metrics";
import { questionBank, seniorityConfig } from "@/lib/rehearse/questions/question-bank";
import {
  applyCaps,
  detectCaps,
  evaluateAnswerHeuristically,
} from "@/lib/rehearse/scoring/evaluate-answer";

describe("evaluate-answer scoring", () => {
  it("applies the strictest cap when multiple caps are present", () => {
    expect(applyCaps(5, ["no_reflection", "no_result"])).toBe(2);
  });

  it("adds senior-plus tradeoff cap and short answer cap deterministically", () => {
    const question = questionBank.find((item) => item.code === "Q1");
    if (!question) {
      throw new Error("Expected Q1 in the question bank.");
    }

    const transcript =
      "When I owned the launch, I led the work and improved the process by 20%.";
    const deliveryMetrics = computeDeliveryMetrics(transcript, 22);
    const caps = detectCaps(
      {
        question,
        transcript,
        seniorityLevel: "senior",
        seniorityMultiplier: seniorityConfig.senior.multiplier,
        deliveryMetrics,
        previousAttempts: [],
        cvSummary: null,
        jdSummary: null,
      },
      ["tradeoff"],
      transcript.toLowerCase(),
    );

    expect(caps).toContain("no_tradeoff_senior_plus");
    expect(caps).toContain("short_answer_cap");
  });

  it("returns a capped score for short answers that miss core result structure", () => {
    const question = questionBank.find((item) => item.code === "Q1");
    if (!question) {
      throw new Error("Expected Q1 in the question bank.");
    }

    const transcript = "I led the project and aligned the team.";
    const result = evaluateAnswerHeuristically({
      question,
      transcript,
      seniorityLevel: "senior",
      seniorityMultiplier: seniorityConfig.senior.multiplier,
      deliveryMetrics: computeDeliveryMetrics(transcript, 20),
      previousAttempts: [],
      cvSummary: null,
      jdSummary: null,
    });

    expect(result.evaluation.finalContentScoreAfterCaps).toBeLessThanOrEqual(2);
    expect(result.evaluation.capsApplied).toContain("short_answer_cap");
    expect(result.feedback.verdict).toBe("Needs more detail");
    expect(result.feedback.improveNext.length).toBeGreaterThan(0);
    expect(result.feedback.starCoverage.result).toBe(false);
  });

  it("returns sentence-case improvement items and includes delivery coaching", () => {
    const question = questionBank.find((item) => item.code === "Q1");
    if (!question) {
      throw new Error("Expected Q1 in the question bank.");
    }

    const transcript =
      "When I led the launch, I was responsible for coordinating the team and I kept saying um while I explained it.";
    const result = evaluateAnswerHeuristically({
      question,
      transcript,
      seniorityLevel: "senior",
      seniorityMultiplier: seniorityConfig.senior.multiplier,
      deliveryMetrics: {
        ...computeDeliveryMetrics(transcript, 210),
        fillerRate: 6,
        longPauseCount: 3,
        fragmentationScore: 4,
        wordsPerMinute: 185,
      },
      previousAttempts: [],
      cvSummary: null,
      jdSummary: null,
    });

    expect(result.feedback.improveNext).toContain(
      "State the result and what changed because of your work.",
    );
    expect(result.feedback.improveNext).toContain(
      "Cut filler words so the answer sounds more confident.",
    );
    expect(result.feedback.improveNext.every((item) => /^[A-Z]/.test(item))).toBe(true);
  });

  it("adds role relevance feedback only when role context is available", () => {
    const question = questionBank.find((item) => item.code === "Q1");
    if (!question) {
      throw new Error("Expected Q1 in the question bank.");
    }

    const transcript =
      "When I owned the roadmap planning cycle, I aligned stakeholders across product and operations, improved execution clarity, and reduced missed deadlines by 22%.";
    const withRoleContext = evaluateAnswerHeuristically({
      question,
      transcript,
      seniorityLevel: "senior",
      seniorityMultiplier: seniorityConfig.senior.multiplier,
      deliveryMetrics: computeDeliveryMetrics(transcript, 120),
      previousAttempts: [],
      cvSummary: null,
      jdSummary: {
        coreCompetencies: ["Stakeholder management", "Roadmap execution"],
        leadershipExpectationLevel: "high",
        strategicVsExecutionWeight: "balanced",
        stakeholderComplexityLevel: "high",
        performanceKeywords: ["Execution excellence"],
      },
    });
    const withoutRoleContext = evaluateAnswerHeuristically({
      question,
      transcript,
      seniorityLevel: "senior",
      seniorityMultiplier: seniorityConfig.senior.multiplier,
      deliveryMetrics: computeDeliveryMetrics(transcript, 120),
      previousAttempts: [],
      cvSummary: null,
      jdSummary: null,
    });

    expect(withRoleContext.evaluation.roleRelevance?.assessment).toBe("direct_match");
    expect(withRoleContext.feedback.roleRelevance?.headline).toBe(
      "The example feels directly relevant to the role.",
    );
    expect(withoutRoleContext.feedback.roleRelevance).toBeUndefined();
    expect(withRoleContext.evaluation.finalContentScoreAfterCaps).toBeGreaterThan(0);
  });
});
