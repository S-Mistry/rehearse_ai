import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http/api-response";
import { createSession } from "@/lib/rehearse/repositories/memory-store";
import { questionOrder } from "@/lib/rehearse/questions/question-bank";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const session = await createSession({
      seniorityLevel: body.seniorityLevel,
      cvProfileId: body.cvProfileId ?? null,
      jdProfileId: body.jdProfileId ?? null,
    });

    return NextResponse.json({
      sessionId: session.id,
      status: session.status,
      questionCodes: questionOrder,
    });
  } catch (error) {
    return jsonError(
      500,
      "SESSION_CREATE_FAILED",
      error instanceof Error ? error.message : "Unable to create the session.",
    );
  }
}
