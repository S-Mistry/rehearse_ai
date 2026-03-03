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
  });
});
