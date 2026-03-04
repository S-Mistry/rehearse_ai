import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http/api-response";
import type { ConversationTurn } from "@/types/rehearse";
import { ScoreLiveRoundError, scoreLiveRound } from "@/lib/rehearse/interview/score-live-round";

type ScorePhase = "probe" | "final";

export async function POST(
  request: Request,
  { params }: { params: { sessionQuestionId: string } },
) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    const body = contentType.includes("multipart/form-data")
      ? await readMultipartRequest(request)
      : await readJsonRequest(request);

    const payload = await scoreLiveRound({
      sessionQuestionId: params.sessionQuestionId,
      ...body,
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
      "ROUND_SCORE_FAILED",
      error instanceof Error ? error.message : "Unable to score the interview round.",
    );
  }
}

async function readJsonRequest(request: Request) {
  const body = (await request.json()) as {
    conversationTurns?: ConversationTurn[];
    durationSeconds?: number;
    phase?: ScorePhase;
    followUpCount?: number;
    activeAnswerTurnId?: string;
    transcript?: string;
  };

  return {
    conversationTurns: body.conversationTurns,
    durationSeconds: body.durationSeconds,
    phase: body.phase,
    followUpCount: body.followUpCount,
    activeAnswerTurnId: body.activeAnswerTurnId,
    transcript: body.transcript,
  };
}

async function readMultipartRequest(request: Request) {
  const formData = await request.formData();
  const conversationTurnsRaw = String(formData.get("conversationTurns") ?? "").trim();

  return {
    audioFile: formData.get("audio") instanceof File ? (formData.get("audio") as File) : null,
    conversationTurns: parseConversationTurns(conversationTurnsRaw),
    durationSeconds: Number(formData.get("durationSeconds") ?? 0) || undefined,
    phase: parsePhase(formData.get("phase")),
    followUpCount: Number(formData.get("followUpCount") ?? 0) || 0,
    activeAnswerTurnId: String(formData.get("activeAnswerTurnId") ?? "").trim() || undefined,
    transcript: String(formData.get("transcript") ?? "").trim() || undefined,
  };
}

function parseConversationTurns(value: string) {
  if (!value) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(value) as ConversationTurn[];
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function parsePhase(value: FormDataEntryValue | null) {
  return (value === "final" ? "final" : "probe") as ScorePhase;
}
