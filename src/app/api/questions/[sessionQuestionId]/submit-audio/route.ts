import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http/api-response";
import {
  ScoreLiveRoundError,
  scoreLiveRound,
} from "@/lib/rehearse/interview/score-live-round";

export async function POST(
  request: Request,
  { params }: { params: { sessionQuestionId: string } },
) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio");
    const payload = await scoreLiveRound({
      sessionQuestionId: params.sessionQuestionId,
      audioFile: audioFile instanceof File ? audioFile : null,
      conversationTurns: undefined,
      durationSeconds: Number(formData.get("durationSeconds") ?? "90"),
      phase: "final",
      followUpCount: 1,
      transcript: String(formData.get("transcript") ?? "").trim() || undefined,
    });

    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof ScoreLiveRoundError) {
      if (error.code === "SAFETY_PAUSE") {
        return NextResponse.json({
          flagged: true,
          error: {
            code: error.code,
            message: error.message,
          },
        });
      }

      return jsonError(error.status, error.code, error.message);
    }

    return jsonError(
      500,
      "ANSWER_SCORE_FAILED",
      error instanceof Error ? error.message : "Unable to score the answer.",
    );
  }
}
