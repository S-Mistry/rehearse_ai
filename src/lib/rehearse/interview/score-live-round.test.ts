import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  AttemptFeedback,
  EvaluationResult,
  SessionBundle,
  SessionQuestionRecord,
  StarSectionAssessment,
} from "@/types/rehearse";

const submitQuestionAttempt = vi.fn();
const getSessionQuestion = vi.fn();
const getSessionBundle = vi.fn();
const moderateText = vi.fn();
const transcribePrimary = vi.fn();
const transcribeForMetrics = vi.fn();
const evaluateAnswer = vi.fn();
const generateInterviewerSpeech = vi.fn();

vi.mock("@/lib/rehearse/repositories/memory-store", () => ({
  submitQuestionAttempt,
  getSessionQuestion,
  getSessionBundle,
}));

vi.mock("@/lib/rehearse/services/rehearse-service", () => ({
  moderateText,
  transcribePrimary,
  transcribeForMetrics,
  evaluateAnswer,
  generateInterviewerSpeech,
}));

function buildStarAssessment(
  overrides: Partial<Record<"situation" | "task" | "action" | "result", Partial<StarSectionAssessment>>> = {},
) {
  return {
    situation: {
      status: "covered",
      reason: "Clear context.",
      evidence: "When the migration slipped...",
      qualityScore: 2,
      ...overrides.situation,
    },
    task: {
      status: "covered",
      reason: "Clear ownership.",
      evidence: "I was responsible for recovering the launch.",
      qualityScore: 2,
      ...overrides.task,
    },
    action: {
      status: "covered",
      reason: "Concrete actions.",
      evidence: "I mapped the critical path and aligned engineering.",
      qualityScore: 2,
      ...overrides.action,
    },
    result: {
      status: "missing",
      reason: "No result yet.",
      evidence: null,
      qualityScore: 0,
      ...overrides.result,
    },
  } satisfies EvaluationResult["starAssessment"];
}

function buildEvaluation(
  overrides: Partial<EvaluationResult> = {},
): EvaluationResult {
  return {
    contentScoreRaw: 3,
    finalContentScoreAfterCaps: 3,
    weightedContentScore: 3.6,
    weightedContentMax: 6,
    deliveryScore: 3,
    criterionAssessment: {
      situation: {
        status: "covered",
        reason: "Clear context.",
        evidence: "When the migration slipped...",
        qualityScore: 2,
      },
      task: {
        status: "covered",
        reason: "Clear ownership.",
        evidence: "I was responsible for recovering the launch.",
        qualityScore: 2,
      },
      action: {
        status: "covered",
        reason: "Concrete actions.",
        evidence: "I mapped the critical path and aligned engineering.",
        qualityScore: 2,
      },
      result: {
        status: "missing",
        reason: "No result yet.",
        evidence: null,
        qualityScore: 0,
      },
      metric: {
        status: "missing",
        reason: "No metric yet.",
        evidence: null,
        qualityScore: 0,
      },
      ownership: {
        status: "covered",
        reason: "Ownership is clear.",
        evidence: "I was responsible for recovering the launch.",
        qualityScore: 2,
      },
      reflection: {
        status: "missing",
        reason: "No reflection yet.",
        evidence: null,
        qualityScore: 0,
      },
      tradeoff: {
        status: "missing",
        reason: "No trade-off yet.",
        evidence: null,
        qualityScore: 0,
      },
      resistance: {
        status: "covered",
        reason: "No resistance required for this answer.",
        evidence: null,
        qualityScore: 2,
      },
      strategic_layer: {
        status: "weak",
        reason: "Broader impact is implied.",
        evidence: "Aligned engineering.",
        qualityScore: 1,
      },
    },
    starAssessment: buildStarAssessment(),
    missingComponents: ["result"],
    strengths: ["Clear ownership"],
    nudges: ["Close with the measurable result."],
    capsApplied: [],
    contentReasoning: {
      structure: "ok",
      ownership: "ok",
      metrics: "missing",
      tradeoffs: "missing",
      reflection: "missing",
    },
    deliveryReasoning: {
      clarity: "ok",
      pacing: "ok",
      fillerAssessment: "ok",
      conciseness: "ok",
    },
    roleRelevance: {
      assessment: "not_enough_context",
      reasoning: "No role context.",
      bridge: null,
    },
    ...overrides,
  };
}

function buildFeedback(overrides: Partial<AttemptFeedback> = {}): AttemptFeedback {
  return {
    verdict: "Good answer",
    headline: "The story needs a clearer result so the answer actually lands.",
    scoreExplanation: "This lands at 3/5 because the result still needs more interview-ready detail.",
    strengths: ["Strong ownership"],
    improveNext: ["State the result and what changed because of your work."],
    deliverySummary: "Delivery was clear.",
    retryPrompt: "Close with the metric and final outcome.",
    starCoverage: {
      situation: "covered",
      task: "covered",
      action: "covered",
      result: "missing",
    },
    missingElements: ["result"],
    spokenRecap: "Good answer. Close with the metric and final outcome.",
    ...overrides,
  };
}

function buildBundle(questionStatus: SessionQuestionRecord["status"] = "active"): SessionBundle {
  return {
    session: {
      id: "session-1",
      userId: "user-1",
      status: "active",
      seniorityLevel: "senior",
      seniorityMultiplier: 1.2,
      targetRoleTitle: null,
      targetCompanyName: null,
      cvProfileId: null,
      jdProfileId: null,
      startedAt: null,
      completedAt: null,
      createdAt: "2026-03-03T00:00:00.000Z",
      questionIds: ["sq-1"],
    },
    questions: [
      {
        id: "sq-1",
        sessionId: "session-1",
        questionId: "qb-1",
        questionCode: "Q1",
        status: questionStatus,
        attemptCount: questionStatus === "awaiting_retry" ? 1 : 0,
        finalContentRaw: null,
        finalContentCapped: null,
        finalContentWeighted: null,
        deliveryScore: null,
        finalFeedback: null,
        forcedScoringReason: null,
        attempts: [],
        evaluations: [],
        bank: {
          id: "qb-1",
          code: "Q1",
          order: 1,
          prompt: "Tell me about a time you led a challenging project.",
          title: "Led a challenging project",
          category: "Leadership",
          rubricVersion: "2026-03-03-v1",
          rubric: {
            mustInclude: ["result"],
            score5Signals: ["clear scope"],
          },
        },
      },
    ],
    cvProfile: null,
    jdProfile: null,
    aggregate: {
      averageRawContent: 0,
      averageWeightedContent: 0,
      averageWeightedMax: 0,
      averageDelivery: 0,
      strongestQuestionCode: null,
      weakestQuestionCode: null,
      completedQuestions: 0,
      totalQuestions: 10,
    },
  };
}

describe("score-live-round", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    getSessionQuestion.mockResolvedValue({
      id: "sq-1",
      sessionId: "session-1",
      questionCode: "Q1",
      attempts: [],
    });
    getSessionBundle.mockResolvedValue(buildBundle());
    moderateText.mockResolvedValue({
      flagged: false,
      categories: [],
      actionTaken: "allow",
    });
    transcribePrimary.mockResolvedValue({
      transcript: "canonical audio transcript",
      provider: "gpt-4o-transcribe",
    });
    transcribeForMetrics.mockResolvedValue({
      durationSeconds: 70,
      wordCount: 25,
      fillerCount: 0,
      fillerRate: 0,
      wordsPerMinute: 21,
      longPauseCount: 0,
      pauseEvents: [],
      fragmentationScore: 1,
    });
    evaluateAnswer.mockResolvedValue({
      evaluation: buildEvaluation(),
      feedback: buildFeedback(),
      provider: "openai:gpt-4.1",
      modelName: "gpt-4.1",
      promptVersion: "2026-03-03-v1",
    });
    generateInterviewerSpeech.mockResolvedValue({
      mimeType: "audio/mpeg",
      base64Audio: "ZmFrZQ==",
    });
    submitQuestionAttempt.mockResolvedValue({
      question: {},
      attempt: {},
      evaluation: {},
      metrics: {},
    });
  });

  it("returns a Lucy follow-up and replaces the targeted candidate turn", async () => {
    const { scoreLiveRound } = await import("@/lib/rehearse/interview/score-live-round");

    const result = await scoreLiveRound({
      sessionQuestionId: "sq-1",
      audioFile: {} as File,
      conversationTurns: [
        {
          id: "intro",
          speaker: "interviewer",
          text: "Hi, I'm Lucy.",
          status: "final",
        },
        {
          id: "answer-1",
          speaker: "candidate",
          text: "",
          status: "partial",
        },
      ],
      activeAnswerTurnId: "answer-1",
      phase: "probe",
      followUpCount: 0,
    });

    expect(result.phase).toBe("follow_up");
    expect(result.transcript).toBe("canonical audio transcript");
    expect(result.followUpPrompt).toContain("Thanks. One follow-up before I score it:");
    expect(result.conversationTurns).toHaveLength(3);
    expect(result.conversationTurns[1]?.speaker).toBe("candidate");
    expect(result.conversationTurns[1]?.id).toBe("answer-1");
    expect(result.conversationTurns[1]?.text).toBe("canonical audio transcript");
    expect(result.speech.available).toBe(true);
  });

  it("falls back to the latest candidate turn when no active turn id is provided", async () => {
    const { scoreLiveRound } = await import("@/lib/rehearse/interview/score-live-round");

    const result = await scoreLiveRound({
      sessionQuestionId: "sq-1",
      audioFile: {} as File,
      conversationTurns: [
        {
          id: "intro",
          speaker: "interviewer",
          text: "Hi, I'm Lucy.",
          status: "final",
        },
        {
          id: "answer-1",
          speaker: "candidate",
          text: "first answer",
          status: "final",
        },
        {
          id: "answer-2",
          speaker: "candidate",
          text: "browser draft transcript",
          status: "partial",
        },
      ],
      phase: "final",
      followUpCount: 1,
    });

    expect(result.phase).toBe("final");
    expect(submitQuestionAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        transcriptProvider: "gpt-4o-transcribe",
        transcriptText: "first answer canonical audio transcript",
        conversationTurns: expect.arrayContaining([
          expect.objectContaining({
            id: "answer-1",
            text: "first answer",
          }),
          expect.objectContaining({
            id: "answer-2",
            text: "canonical audio transcript",
            status: "final",
          }),
        ]),
      }),
    );
    expect(result.speech.available).toBe(true);
  });
});
