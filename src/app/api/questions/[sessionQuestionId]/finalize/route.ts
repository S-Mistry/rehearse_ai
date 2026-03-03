import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http/api-response";
import {
  finalizeQuestion,
  getSessionBundle,
  getSessionQuestion,
} from "@/lib/rehearse/repositories/memory-store";

export async function POST(
  _request: Request,
  { params }: { params: { sessionQuestionId: string } },
) {
  try {
    const question = await getSessionQuestion(params.sessionQuestionId);
    if (!question) {
      return jsonError(404, "QUESTION_NOT_FOUND", "Question not found.");
    }

    const finalized = await finalizeQuestion(question.id);
    if (!finalized) {
      return jsonError(
        400,
        "QUESTION_NOT_READY",
        "You need at least one evaluated attempt before finalizing.",
      );
    }

    const bundle = await getSessionBundle(question.sessionId);
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
  } catch (error) {
    return jsonError(
      500,
      "QUESTION_FINALIZE_FAILED",
      error instanceof Error ? error.message : "Unable to finalize the question.",
    );
  }
}
