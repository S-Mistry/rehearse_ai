import { NextResponse } from "next/server";
import { createSession } from "@/lib/rehearse/repositories/memory-store";
import { questionOrder } from "@/lib/rehearse/questions/question-bank";

export async function POST(request: Request) {
  const body = await request.json();
  const session = createSession({
    seniorityLevel: body.seniorityLevel,
    cvProfileId: body.cvProfileId ?? null,
    jdProfileId: body.jdProfileId ?? null,
  });

  return NextResponse.json({
    sessionId: session.id,
    status: session.status,
    questionCodes: questionOrder,
  });
}
