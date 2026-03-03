import { NextResponse } from "next/server";
import { getHistorySession } from "@/lib/rehearse/repositories/memory-store";

export async function GET(
  _request: Request,
  { params }: { params: { sessionId: string } },
) {
  const bundle = getHistorySession(params.sessionId);
  if (!bundle) {
    return NextResponse.json({ message: "Session not found." }, { status: 404 });
  }

  return NextResponse.json(bundle);
}
