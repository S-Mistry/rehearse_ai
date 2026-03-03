import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http/api-response";
import { getHistorySession } from "@/lib/rehearse/repositories/memory-store";

export async function GET(
  _request: Request,
  { params }: { params: { sessionId: string } },
) {
  try {
    const bundle = await getHistorySession(params.sessionId);
    if (!bundle) {
      return jsonError(404, "SESSION_NOT_FOUND", "Session not found.");
    }

    return NextResponse.json(bundle);
  } catch (error) {
    return jsonError(
      500,
      "HISTORY_LOAD_FAILED",
      error instanceof Error ? error.message : "Unable to load the session history.",
    );
  }
}
