import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http/api-response";
import { buildInterviewerIntro } from "@/lib/rehearse/interview/interviewer-persona";
import { generateInterviewerSpeech } from "@/lib/rehearse/services/rehearse-service";
import {
  getSessionBundle,
  getSessionQuestion,
} from "@/lib/rehearse/repositories/memory-store";

export async function POST(
  _request: Request,
  { params }: { params: { sessionQuestionId: string } },
) {
  try {
    const sessionQuestion = await getSessionQuestion(params.sessionQuestionId);
    if (!sessionQuestion) {
      return jsonError(404, "QUESTION_NOT_FOUND", "Question not found.");
    }

    const bundle = await getSessionBundle(sessionQuestion.sessionId);
    const bankQuestion = bundle?.questions.find((item) => item.id === sessionQuestion.id)?.bank;
    if (!bundle || !bankQuestion) {
      return jsonError(404, "SESSION_CONTEXT_NOT_FOUND", "Session context not found.");
    }

    const intro = buildInterviewerIntro(bankQuestion);
    const speech = await generateInterviewerSpeech(intro, "intro");

    return NextResponse.json({
      text: intro,
      speech: speech
        ? {
            available: true,
            mimeType: speech.mimeType,
            audioBase64: speech.base64Audio,
          }
        : {
            available: false,
          },
    });
  } catch (error) {
    return jsonError(
      500,
      "INTRO_SPEECH_FAILED",
      error instanceof Error ? error.message : "Unable to prepare the interview intro.",
    );
  }
}
