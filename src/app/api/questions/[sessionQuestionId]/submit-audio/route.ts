import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http/api-response";
import {
  getSessionBundle,
  getSessionQuestion,
  submitQuestionAttempt,
} from "@/lib/rehearse/repositories/memory-store";
import type { TranscriptAttemptRecord } from "@/types/rehearse";
import {
  evaluateAnswer,
  generateSpeech,
  moderateText,
  transcribeForMetrics,
  transcribePrimary,
} from "@/lib/rehearse/services/rehearse-service";

export async function POST(
  request: Request,
  { params }: { params: { sessionQuestionId: string } },
) {
  try {
    const sessionQuestion = await getSessionQuestion(params.sessionQuestionId);
    if (!sessionQuestion) {
      return jsonError(404, "QUESTION_NOT_FOUND", "Question not found.");
    }

    const bundle = await getSessionBundle(sessionQuestion.sessionId);
    const bankQuestion = bundle?.questions.find((item) => item.id === sessionQuestion.id)?.bank;
    if (!bundle || !bankQuestion) {
      return jsonError(404, "SESSION_CONTEXT_NOT_FOUND", "Session context not found.");
    }

    const formData = await request.formData();
    const audioFile = formData.get("audio");
    const manualTranscript = String(formData.get("transcript") ?? "").trim();
    const durationSeconds = Number(formData.get("durationSeconds") ?? "90");
    const transcription = await transcribePrimary(
      audioFile instanceof File ? audioFile : null,
      manualTranscript,
    );
    const transcript = transcription.transcript;

    if (!transcript) {
      return jsonError(
        400,
        "TRANSCRIPT_REQUIRED",
        "Provide a transcript or configure voice transcription.",
      );
    }

    const moderation = await moderateText(transcript);
    if (moderation.flagged) {
      return NextResponse.json({
        flagged: true,
        error: {
          code: "SAFETY_PAUSE",
          message:
          "This answer triggered a safety pause. Restart the question or edit the transcript before retrying.",
        },
        transcript,
      });
    }

    const deliveryMetrics = await transcribeForMetrics(
      audioFile instanceof File ? audioFile : null,
      transcript,
      durationSeconds,
    );

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

    const stored = await submitQuestionAttempt({
      sessionQuestionId: sessionQuestion.id,
      transcriptProvider: transcription.provider,
      transcriptText: transcript,
      durationSeconds,
      deliveryMetrics,
      evaluationProvider: evaluationBundle.provider,
      evaluationModelName: evaluationBundle.modelName,
      evaluationPromptVersion: evaluationBundle.promptVersion,
      evaluation: evaluationBundle.evaluation,
      feedback: evaluationBundle.feedback,
    });

    if (!stored) {
      return jsonError(500, "ANSWER_PERSIST_FAILED", "Unable to persist the answer.");
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

    const speech = await generateSpeech(evaluationBundle.feedback.spokenText);

    return NextResponse.json({
      transcript,
      transcriptProvider: transcription.provider,
      deliveryMetrics,
      evaluation: evaluationBundle.evaluation,
      evaluationProvider: evaluationBundle.provider,
      feedback: evaluationBundle.feedback,
      questionStatus: refreshedQuestion?.status ?? "awaiting_retry",
      remainingAttempts: Math.max(0, 3 - (refreshedQuestion?.attemptCount ?? 0)),
      nextRoute,
      speech: speech
        ? {
            available: true,
            mimeType: speech.mimeType,
            audioBase64: speech.base64Audio,
          }
        : {
            available: false,
          },
    });
  } catch (error) {
    return jsonError(
      500,
      "ANSWER_SCORE_FAILED",
      error instanceof Error ? error.message : "Unable to score the answer.",
    );
  }
}
