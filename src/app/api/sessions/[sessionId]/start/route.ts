import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http/api-response";
import { getSessionBundle, startSession } from "@/lib/rehearse/repositories/memory-store";

export async function POST(
  _request: Request,
  { params }: { params: { sessionId: string } },
) {
  try {
    const [session, bundle] = await Promise.all([
      startSession(params.sessionId),
      getSessionBundle(params.sessionId),
    ]);
    const activeQuestion = bundle?.questions.find((question) => question.status === "active");

    if (!session || !activeQuestion) {
      return jsonError(404, "SESSION_NOT_FOUND", "Unable to start the session.");
    }

    return NextResponse.json({
      sessionId: session.id,
      nextRoute: `/session/${session.id}/question/${activeQuestion.questionCode}`,
    });
  } catch (error) {
    return jsonError(
      500,
      "SESSION_START_FAILED",
      error instanceof Error ? error.message : "Unable to start the session.",
    );
  }
}
