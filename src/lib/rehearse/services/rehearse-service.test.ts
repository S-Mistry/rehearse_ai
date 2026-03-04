import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  appMode: {
    hasOpenAI: false,
  },
}));

describe("rehearse-service fallbacks", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns the local parser provider when OpenAI is unavailable", async () => {
    const { extractCvProfile } = await import("@/lib/rehearse/services/rehearse-service");
    const result = await extractCvProfile(
      "Senior Product Manager\nLed onboarding redesign and improved activation by 24%.",
    );

    expect(result.provider).toBe("fallback:local-parser");
    expect(result.structured.roles.length).toBeGreaterThanOrEqual(1);
  });

  it("returns a heuristic evaluation provider when OpenAI is unavailable", async () => {
    const { evaluateAnswer } = await import("@/lib/rehearse/services/rehearse-service");
    const { computeDeliveryMetrics } = await import("@/lib/rehearse/delivery/metrics");
    const { questionBank, seniorityConfig } = await import(
      "@/lib/rehearse/questions/question-bank"
    );

    const question = questionBank.find((item) => item.code === "Q1");
    if (!question) {
      throw new Error("Expected Q1 in the question bank.");
    }

    const transcript =
      "When I led a merger onboarding project, I aligned product and support, chose to delay a low-value feature, reduced onboarding time by 28%, and learned to surface trade-offs earlier.";

    const result = await evaluateAnswer({
      question,
      transcript,
      seniorityLevel: "senior",
      seniorityMultiplier: seniorityConfig.senior.multiplier,
      deliveryMetrics: computeDeliveryMetrics(transcript, 120),
      previousAttempts: [],
      cvSummary: null,
      jdSummary: null,
    });

    expect(result.provider).toBe("fallback:heuristic");
    expect(result.modelName).toBe("heuristic");
    expect(result.evaluation.weightedContentMax).toBe(6);
  });

  it("falls back to the supplied transcript when audio-first transcription is unavailable", async () => {
    const { transcribePrimary, generateInterviewerSpeech } = await import(
      "@/lib/rehearse/services/rehearse-service"
    );

    const transcription = await transcribePrimary(null, "typed fallback", true);
    const speech = await generateInterviewerSpeech("Hi, I'm Lucy.", "intro");

    expect(transcription).toEqual({
      transcript: "typed fallback",
      provider: "manual-transcript",
    });
    expect(speech).toBeNull();
  });
});
