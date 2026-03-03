import { NextResponse } from "next/server";
import {
  getSessionBundle,
  getSessionQuestion,
  submitQuestionAttempt,
} from "@/lib/rehearse/repositories/memory-store";
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
  const sessionQuestion = getSessionQuestion(params.sessionQuestionId);
  if (!sessionQuestion) {
    return NextResponse.json({ message: "Question not found." }, { status: 404 });
  }

  const bundle = getSessionBundle(sessionQuestion.sessionId);
  const bankQuestion = bundle?.questions.find((item) => item.id === sessionQuestion.id)?.bank;
  if (!bundle || !bankQuestion) {
    return NextResponse.json({ message: "Session context not found." }, { status: 404 });
  }

  const formData = await request.formData();
  const audioFile = formData.get("audio");
  const manualTranscript = String(formData.get("transcript") ?? "").trim();
  const durationSeconds = Number(formData.get("durationSeconds") ?? "90");
  const transcript = await transcribePrimary(
    audioFile instanceof File ? audioFile : null,
    manualTranscript,
  );

  if (!transcript) {
    return NextResponse.json(
      { message: "Provide a transcript or configure voice transcription." },
      { status: 400 },
    );
  }

  const moderation = await moderateText(transcript);
  if (moderation.flagged) {
    return NextResponse.json({
      flagged: true,
      message:
        "This answer triggered a safety pause. Restart the question or edit the transcript before retrying.",
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
    previousAttempts: sessionQuestion.attempts.map((attempt) => attempt.transcriptText),
    cvSummary: (bundle.cvProfile?.structuredJson as never) ?? null,
    jdSummary: (bundle.jdProfile?.structuredJson as never) ?? null,
  });

  const stored = submitQuestionAttempt({
    sessionQuestionId: sessionQuestion.id,
    transcriptText: transcript,
    durationSeconds,
    evaluation: evaluationBundle.evaluation,
    feedback: evaluationBundle.feedback,
  });

  if (!stored) {
    return NextResponse.json(
      { message: "Unable to persist the answer." },
      { status: 500 },
    );
  }

  const refreshedBundle = getSessionBundle(sessionQuestion.sessionId);
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
    deliveryMetrics,
    evaluation: evaluationBundle.evaluation,
    feedback: evaluationBundle.feedback,
    questionStatus: refreshedQuestion?.status ?? "awaiting_retry",
    remainingAttempts: Math.max(0, 3 - (refreshedQuestion?.attemptCount ?? 0)),
    nextRoute,
    speech,
  });
}
