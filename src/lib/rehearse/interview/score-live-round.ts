import { randomUUID } from "crypto";
import { computeDeliveryMetrics } from "@/lib/rehearse/delivery/metrics";
import {
  buildInterviewerFeedback,
  buildInterviewerFollowUp,
} from "@/lib/rehearse/interview/interviewer-persona";
import {
  buildFollowUpQuestion,
  combineCandidateTranscript,
  shouldAskFollowUp,
} from "@/lib/rehearse/interview/live-round";
import {
  getSessionBundle,
  getSessionQuestion,
  submitQuestionAttempt,
} from "@/lib/rehearse/repositories/memory-store";
import {
  evaluateAnswer,
  generateInterviewerSpeech,
  moderateText,
  transcribeForMetrics,
  transcribePrimary,
} from "@/lib/rehearse/services/rehearse-service";
import type {
  AttemptFeedback,
  ConversationSpeaker,
  ConversationTurn,
  DeliveryMetrics,
  EvaluationProvider,
  EvaluationResult,
  SessionQuestionStatus,
  TranscriptAttemptRecord,
  TranscriptProvider,
} from "@/types/rehearse";

type ScorePhase = "probe" | "final";

type SpeechResponse =
  | { available: false }
  | { available: true; mimeType: string; audioBase64: string };

export type ScoreLiveRoundResult = {
  phase: "follow_up" | "final";
  transcript: string;
  evaluation: EvaluationResult;
  followUpPrompt?: string | null;
  feedback?: AttemptFeedback;
  questionStatus?: SessionQuestionStatus;
  remainingAttempts?: number;
  nextRoute?: string | null;
  conversationTurns: ConversationTurn[];
  speech: SpeechResponse;
  transcriptProvider: TranscriptProvider;
  evaluationProvider?: EvaluationProvider;
  deliveryMetrics?: DeliveryMetrics;
};

export class ScoreLiveRoundError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ScoreLiveRoundError";
    this.status = status;
    this.code = code;
  }
}

export async function scoreLiveRound(input: {
  sessionQuestionId: string;
  audioFile?: File | null;
  conversationTurns?: ConversationTurn[];
  durationSeconds?: number;
  phase?: ScorePhase;
  followUpCount?: number;
  activeAnswerTurnId?: string | null;
  transcript?: string | null;
}): Promise<ScoreLiveRoundResult> {
  const sessionQuestion = await getSessionQuestion(input.sessionQuestionId);
  if (!sessionQuestion) {
    throw new ScoreLiveRoundError(404, "QUESTION_NOT_FOUND", "Question not found.");
  }

  const bundle = await getSessionBundle(sessionQuestion.sessionId);
  const bankQuestion = bundle?.questions.find((item) => item.id === sessionQuestion.id)?.bank;
  if (!bundle || !bankQuestion) {
    throw new ScoreLiveRoundError(
      404,
      "SESSION_CONTEXT_NOT_FOUND",
      "Session context not found.",
    );
  }

  const normalizedTurns = sanitizeConversationTurns(
    input.conversationTurns ?? [],
    input.activeAnswerTurnId,
  );
  const transcriptFallback = resolveTranscriptFallback(
    normalizedTurns,
    input.activeAnswerTurnId,
    input.transcript,
  );
  const transcription = await transcribePrimary(
    input.audioFile ?? null,
    transcriptFallback,
    Boolean(input.audioFile),
  );
  const canonicalTurns = replaceCandidateTurn(
    normalizedTurns,
    input.activeAnswerTurnId,
    transcription.transcript.trim() || transcriptFallback,
  );
  const transcript = combineCandidateTranscript(canonicalTurns);
  if (!transcript) {
    throw new ScoreLiveRoundError(
      400,
      "TRANSCRIPT_REQUIRED",
      "Say or paste an answer before scoring.",
    );
  }

  const moderation = await moderateText(transcript);
  if (moderation.flagged) {
    throw new ScoreLiveRoundError(
      409,
      "SAFETY_PAUSE",
      "This answer triggered a safety pause. Restart the question before retrying.",
    );
  }

  const durationSeconds = Math.max(
    20,
    Number(input.durationSeconds ?? 0) || Math.round(transcript.split(/\s+/).length / 2),
  );
  const deliveryMetrics = input.audioFile
    ? await transcribeForMetrics(input.audioFile, transcript, durationSeconds)
    : computeDeliveryMetrics(transcript, durationSeconds);

  const evaluationBundle = await evaluateAnswer({
    question: bankQuestion,
    transcript,
    seniorityLevel: bundle.session.seniorityLevel,
    seniorityMultiplier: bundle.session.seniorityMultiplier,
    deliveryMetrics,
    previousAttempts: sessionQuestion.attempts.map(
      (attempt: TranscriptAttemptRecord) => attempt.transcriptText,
    ),
    cvSummary: (bundle.cvProfile?.structuredJson as never) ?? null,
    jdSummary: (bundle.jdProfile?.structuredJson as never) ?? null,
  });

  const shouldReturnFollowUp =
    input.phase !== "final" &&
    (input.followUpCount ?? 0) < 1 &&
    shouldAskFollowUp(evaluationBundle.evaluation);
  const rawFollowUpPrompt = shouldReturnFollowUp
    ? buildFollowUpQuestion(bankQuestion, evaluationBundle.evaluation)
    : null;

  if (rawFollowUpPrompt) {
    const interviewerFollowUp = buildInterviewerFollowUp(rawFollowUpPrompt);
    const turnsWithFollowUp = [
      ...finalizeConversationTurns(canonicalTurns),
      createConversationTurn("interviewer", interviewerFollowUp),
    ];

    return {
      phase: "follow_up",
      transcript,
      evaluation: evaluationBundle.evaluation,
      followUpPrompt: interviewerFollowUp,
      conversationTurns: turnsWithFollowUp,
      speech: await createSpeechResponse(interviewerFollowUp, "follow_up"),
      transcriptProvider: transcription.provider,
      evaluationProvider: evaluationBundle.provider,
      deliveryMetrics,
    };
  }

  const finalTurns = finalizeConversationTurns(canonicalTurns);
  const stored = await submitQuestionAttempt({
    sessionQuestionId: sessionQuestion.id,
    transcriptProvider: transcription.provider,
    transcriptText: transcript,
    conversationTurns: finalTurns,
    durationSeconds,
    deliveryMetrics,
    evaluationProvider: evaluationBundle.provider,
    evaluationModelName: evaluationBundle.modelName,
    evaluationPromptVersion: evaluationBundle.promptVersion,
    evaluation: evaluationBundle.evaluation,
    feedback: evaluationBundle.feedback,
  });

  if (!stored) {
    throw new ScoreLiveRoundError(
      500,
      "ANSWER_PERSIST_FAILED",
      "Unable to persist the answer.",
    );
  }

  const refreshedBundle = await getSessionBundle(sessionQuestion.sessionId);
  const refreshedQuestion = refreshedBundle?.questions.find(
    (item) => item.id === sessionQuestion.id,
  );
  const nextQuestion = refreshedBundle?.questions.find(
    (item) => item.status === "active" || item.status === "awaiting_retry",
  );
  const nextRoute =
    refreshedBundle?.session.status === "completed"
      ? `/session/${sessionQuestion.sessionId}/summary`
      : nextQuestion
        ? `/session/${sessionQuestion.sessionId}/question/${nextQuestion.questionCode}`
        : null;

  const spokenFeedback = buildInterviewerFeedback(evaluationBundle.feedback.spokenRecap);

  return {
    phase: "final",
    transcript,
    conversationTurns: finalTurns,
    evaluation: evaluationBundle.evaluation,
    feedback: evaluationBundle.feedback,
    questionStatus: refreshedQuestion?.status ?? "awaiting_retry",
    remainingAttempts: Math.max(0, 3 - (refreshedQuestion?.attemptCount ?? 0)),
    nextRoute,
    speech: await createSpeechResponse(spokenFeedback, "feedback"),
    transcriptProvider: transcription.provider,
    evaluationProvider: evaluationBundle.provider,
    deliveryMetrics,
  };
}

function sanitizeConversationTurns(
  turns: ConversationTurn[],
  activeAnswerTurnId?: string | null,
) {
  return turns
    .filter(
      (turn): turn is ConversationTurn =>
        Boolean(turn) &&
        typeof turn.text === "string" &&
        typeof turn.speaker === "string" &&
        ["interviewer", "candidate", "system"].includes(turn.speaker),
    )
    .map((turn) => ({
      ...turn,
      text: turn.text.trim(),
    }))
    .filter(
      (turn) =>
        turn.text.length > 0 ||
        (turn.speaker === "candidate" && turn.id === activeAnswerTurnId),
    );
}

function resolveTranscriptFallback(
  turns: ConversationTurn[],
  activeAnswerTurnId?: string | null,
  transcript?: string | null,
) {
  const candidateTranscript = transcript?.trim();
  if (candidateTranscript) {
    return candidateTranscript;
  }

  if (activeAnswerTurnId) {
    const activeTurn = turns.find(
      (turn) => turn.id === activeAnswerTurnId && turn.speaker === "candidate",
    );
    if (activeTurn) {
      return activeTurn.text.trim();
    }
  }

  for (let index = turns.length - 1; index >= 0; index -= 1) {
    const turn = turns[index];
    if (turn.speaker === "candidate" && turn.text.trim()) {
      return turn.text.trim();
    }
  }

  return "";
}

function replaceCandidateTurn(
  turns: ConversationTurn[],
  activeAnswerTurnId: string | null | undefined,
  transcript: string,
) {
  const normalizedTranscript = transcript.trim();
  if (!normalizedTranscript) {
    return turns;
  }

  const nextTurns = [...turns];
  if (activeAnswerTurnId) {
    const activeTurnIndex = nextTurns.findIndex(
      (turn) => turn.id === activeAnswerTurnId && turn.speaker === "candidate",
    );
    if (activeTurnIndex >= 0) {
      nextTurns[activeTurnIndex] = {
        ...nextTurns[activeTurnIndex],
        text: normalizedTranscript,
        status: "final",
      };
      return nextTurns;
    }
  }

  for (let index = nextTurns.length - 1; index >= 0; index -= 1) {
    if (nextTurns[index]?.speaker === "candidate") {
      nextTurns[index] = {
        ...nextTurns[index],
        text: normalizedTranscript,
        status: "final",
      };
      return nextTurns;
    }
  }

  return [...nextTurns, createConversationTurn("candidate", normalizedTranscript)];
}

function finalizeConversationTurns(turns: ConversationTurn[]) {
  return turns.map((turn) => ({
    ...turn,
    status: "final" as const,
  }));
}

function createConversationTurn(speaker: ConversationSpeaker, text: string): ConversationTurn {
  return {
    id: `${speaker}-${randomUUID()}`,
    speaker,
    text,
    status: "final",
    createdAt: new Date().toISOString(),
  };
}

async function createSpeechResponse(
  text: string,
  mode: "follow_up" | "feedback",
): Promise<SpeechResponse> {
  const speech = await generateInterviewerSpeech(text, mode);

  if (!speech) {
    return { available: false };
  }

  return {
    available: true,
    mimeType: speech.mimeType,
    audioBase64: speech.base64Audio,
  };
}
