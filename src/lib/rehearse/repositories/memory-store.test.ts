import { beforeEach, describe, expect, it, vi } from "vitest";
import { computeDeliveryMetrics } from "@/lib/rehearse/delivery/metrics";
import { questionBank, seniorityConfig } from "@/lib/rehearse/questions/question-bank";
import { evaluateAnswerHeuristically } from "@/lib/rehearse/scoring/evaluate-answer";

vi.mock("@/lib/env", () => ({
  appMode: {
    hasSupabaseServer: false,
  },
}));

describe("memory-store in memory mode", () => {
  beforeEach(() => {
    vi.resetModules();
    (globalThis as { __rehearseStore?: unknown }).__rehearseStore = undefined;
  });

  it("creates sessions with the full 10-question bank", async () => {
    const store = await import("@/lib/rehearse/repositories/memory-store");
    const session = await store.createSession({
      seniorityLevel: "senior",
      cvProfileId: null,
      jdProfileId: null,
    });
    const bundle = await store.getSessionBundle(session.id);

    expect(bundle?.questions).toHaveLength(10);
    expect(bundle?.questions[0]?.status).toBe("active");
  });

  it("persists pasted documents and question attempts in memory mode", async () => {
    const store = await import("@/lib/rehearse/repositories/memory-store");
    const document = await store.createDocument({
      id: "doc-test-id",
      kind: "cv",
      fileName: null,
      storagePath: null,
      sourceType: "paste",
      rawText: "Senior Product Manager\nImproved onboarding time by 24%",
      structuredJson: {
        roles: [],
        quantifiedAchievements: [],
        competencySignals: [],
        industryTags: [],
        toolsMethods: [],
      },
      parseStatus: "parsed",
      parseWarnings: [],
      provider: "fallback:local-parser",
    });

    const session = await store.createSession({
      seniorityLevel: "senior",
      cvProfileId: document.id,
      jdProfileId: null,
    });
    const bundle = await store.getSessionBundle(session.id);
    const question = bundle?.questions.find((item) => item.questionCode === "Q1");

    if (!bundle || !question) {
      throw new Error("Expected created session bundle with Q1.");
    }

    const transcript =
      "When I led a challenging onboarding project, I aligned product and support, chose a phased rollout, improved onboarding time by 28%, and learned to surface trade-offs earlier.";
    const evaluationBundle = evaluateAnswerHeuristically({
      question: question.bank,
      transcript,
      seniorityLevel: "senior",
      seniorityMultiplier: seniorityConfig.senior.multiplier,
      deliveryMetrics: computeDeliveryMetrics(transcript, 120),
      previousAttempts: [],
      cvSummary: null,
      jdSummary: null,
    });

    await store.submitQuestionAttempt({
      sessionQuestionId: question.id,
      transcriptProvider: "manual-transcript",
      transcriptText: transcript,
      durationSeconds: 120,
      deliveryMetrics: computeDeliveryMetrics(transcript, 120),
      evaluationProvider: "fallback:heuristic",
      evaluationModelName: "heuristic",
      evaluationPromptVersion: "2026-03-03-v1",
      evaluation: evaluationBundle.evaluation,
      feedback: evaluationBundle.feedback,
    });

    const updatedBundle = await store.getSessionBundle(session.id);
    const updatedQuestion = updatedBundle?.questions.find((item) => item.id === question.id);

    expect(updatedBundle?.cvProfile?.id).toBe(document.id);
    expect(updatedQuestion?.attempts).toHaveLength(1);
    expect(updatedQuestion?.evaluations).toHaveLength(1);
    expect(updatedQuestion?.attempts[0]?.transcriptProvider).toBe("manual-transcript");
    expect(updatedQuestion?.evaluations[0]?.provider).toBe("fallback:heuristic");
    expect(questionBank).toHaveLength(10);
  });
});
