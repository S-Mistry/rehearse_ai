import { NextResponse } from "next/server";
import {
  finalizeQuestion,
  getSessionBundle,
  getSessionQuestion,
} from "@/lib/rehearse/repositories/memory-store";

export async function POST(
  _request: Request,
  { params }: { params: { sessionQuestionId: string } },
) {
  const question = getSessionQuestion(params.sessionQuestionId);
  if (!question) {
    return NextResponse.json({ message: "Question not found." }, { status: 404 });
  }

  const finalized = finalizeQuestion(question.id);
  if (!finalized) {
    return NextResponse.json(
      { message: "You need at least one evaluated attempt before finalizing." },
      { status: 400 },
    );
  }

  const bundle = getSessionBundle(question.sessionId);
  const nextQuestion = bundle?.questions.find(
    (item) => item.status === "active" || item.status === "awaiting_retry",
  );

  return NextResponse.json({
    nextRoute:
      bundle?.session.status === "completed"
        ? `/session/${question.sessionId}/summary`
        : nextQuestion
          ? `/session/${question.sessionId}/question/${nextQuestion.questionCode}`
          : `/session/${question.sessionId}/summary`,
  });
}
