import { NextResponse } from "next/server";
import { getSessionBundle, startSession } from "@/lib/rehearse/repositories/memory-store";

export async function POST(
  _request: Request,
  { params }: { params: { sessionId: string } },
) {
  const session = startSession(params.sessionId);
  const bundle = getSessionBundle(params.sessionId);
  const activeQuestion = bundle?.questions.find((question) => question.status === "active");

  if (!session || !activeQuestion) {
    return NextResponse.json(
      { message: "Unable to start the session." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    sessionId: session.id,
    nextRoute: `/session/${session.id}/question/${activeQuestion.questionCode}`,
  });
}
