import type {
  DeliveryMetrics,
  EvaluationResult,
  JdProfileStructured,
  ModerationResult,
  SpeechPayload,
} from "@/types/rehearse";
import type { CvProfileStructured, EvaluationInput } from "@/types/rehearse";
import { appMode } from "@/lib/env";
import { getOpenAIClient } from "@/lib/openai/client";
import { moderateLocally } from "@/lib/rehearse/safety/moderation";
import { extractCvLocally, extractJdLocally } from "@/lib/rehearse/parsers/structured-extraction";
import { buildEvaluatorPrompt, EVALUATOR_PROMPT_VERSION } from "@/lib/rehearse/prompts/evaluator";
import { CV_EXTRACTION_PROMPT, JD_EXTRACTION_PROMPT, PARSER_PROMPT_VERSION } from "@/lib/rehearse/prompts/parsers";
import { evaluateAnswerHeuristically } from "@/lib/rehearse/scoring/evaluate-answer";
import { evaluationResultSchema } from "@/types/rehearse";
import { zodTextFormat } from "openai/helpers/zod";

const cvSchema = evaluationResultSchema
  .pick({})
  .extend({
    roles: evaluationResultSchema.array().optional(),
  });

export async function moderateText(text: string): Promise<ModerationResult> {
  const local = moderateLocally(text);
  if (local.flagged || !appMode.hasOpenAI) {
    return local;
  }

  const client = getOpenAIClient();
  if (!client) {
    return local;
  }

  const moderation = await client.moderations.create({
    model: "omni-moderation-latest",
    input: text,
  });
  const result = moderation.results[0];
  const categories = Object.entries(result.categories)
    .filter(([, flagged]) => flagged)
    .map(([category]) => category);

  return {
    flagged: result.flagged,
    categories,
    actionTaken: result.flagged ? "pause_evaluation" : "allow",
  };
}

export async function transcribePrimary(
  file: File | null,
  manualTranscript?: string,
) {
  if (manualTranscript?.trim()) {
    return manualTranscript.trim();
  }

  if (!file || !appMode.hasOpenAI) {
    return "";
  }

  const client = getOpenAIClient();
  if (!client) {
    return "";
  }

  const result = await client.audio.transcriptions.create({
    file,
    model: "gpt-4o-transcribe",
  });

  return result.text.trim();
}

export async function transcribeForMetrics(
  file: File | null,
  fallbackTranscript: string,
  fallbackDurationSeconds: number,
): Promise<DeliveryMetrics> {
  if (!file || !appMode.hasOpenAI) {
    const { computeDeliveryMetrics } = await import("@/lib/rehearse/delivery/metrics");
    return computeDeliveryMetrics(fallbackTranscript, fallbackDurationSeconds);
  }

  const client = getOpenAIClient();
  if (!client) {
    const { computeDeliveryMetrics } = await import("@/lib/rehearse/delivery/metrics");
    return computeDeliveryMetrics(fallbackTranscript, fallbackDurationSeconds);
  }

  const verbose = await client.audio.transcriptions.create({
    file,
    model: "whisper-1",
    response_format: "verbose_json",
    timestamp_granularities: ["word"],
  });

  const words = verbose.words ?? [];
  const longPauseCount = words.reduce((count, word, index) => {
    if (index === 0) return count;
    const previous = words[index - 1];
    return word.start - previous.end > 2.5 ? count + 1 : count;
  }, 0);

  const { computeDeliveryMetrics } = await import("@/lib/rehearse/delivery/metrics");
  const derived = computeDeliveryMetrics(
    fallbackTranscript || verbose.text,
    Math.max(fallbackDurationSeconds, verbose.duration ?? fallbackDurationSeconds),
  );

  return {
    ...derived,
    longPauseCount,
    pauseEvents: words
      .map((word, index) => {
        if (index === 0) return null;
        const previous = words[index - 1];
        const durationMs = (word.start - previous.end) * 1000;
        if (durationMs <= 2500) return null;
        return {
          startMs: previous.end * 1000,
          endMs: word.start * 1000,
          durationMs,
        };
      })
      .filter(Boolean) as DeliveryMetrics["pauseEvents"],
  };
}

export async function evaluateAnswer(
  input: EvaluationInput,
): Promise<{
  evaluation: EvaluationResult;
  feedback: ReturnType<typeof evaluateAnswerHeuristically>["feedback"];
}> {
  if (!appMode.hasOpenAI) {
    return evaluateAnswerHeuristically(input);
  }

  const client = getOpenAIClient();
  if (!client) {
    return evaluateAnswerHeuristically(input);
  }

  try {
    const prompt = buildEvaluatorPrompt(input);
    const response = await client.responses.parse({
      model: "gpt-4.1",
      input: [
        { role: "system", content: "Return structured behavioural interview evaluation JSON only." },
        { role: "user", content: prompt },
      ],
      text: {
        format: zodTextFormat(evaluationResultSchema, "evaluation_result"),
      },
    });

    const parsed = response.output_parsed;
    if (!parsed) {
      return evaluateAnswerHeuristically(input);
    }

    const heuristic = evaluateAnswerHeuristically(input);
    const evaluation: EvaluationResult = {
      ...heuristic.evaluation,
      ...parsed,
      missingComponents: parsed.missingComponents as EvaluationResult["missingComponents"],
      capsApplied: parsed.capsApplied as EvaluationResult["capsApplied"],
    };

    return {
      evaluation,
      feedback: heuristic.feedback,
    };
  } catch {
    return evaluateAnswerHeuristically(input);
  }
}

export async function extractCvProfile(rawText: string): Promise<{
  structured: CvProfileStructured;
  warnings: string[];
  provider: string;
}> {
  const local = extractCvLocally(rawText);
  if (!appMode.hasOpenAI) {
    return { ...local, provider: "local-heuristic" };
  }

  return {
    ...local,
    provider: `openai-fallback:${PARSER_PROMPT_VERSION}:${CV_EXTRACTION_PROMPT.length}`,
  };
}

export async function extractJdProfile(rawText: string): Promise<{
  structured: JdProfileStructured;
  warnings: string[];
  provider: string;
}> {
  const local = extractJdLocally(rawText);
  if (!appMode.hasOpenAI) {
    return { ...local, provider: "local-heuristic" };
  }

  return {
    ...local,
    provider: `openai-fallback:${PARSER_PROMPT_VERSION}:${JD_EXTRACTION_PROMPT.length}`,
  };
}

export async function generateSpeech(text: string): Promise<SpeechPayload | null> {
  if (!appMode.hasOpenAI) {
    return null;
  }

  const client = getOpenAIClient();
  if (!client) {
    return null;
  }

  const response = await client.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: "sage",
    response_format: "mp3",
    input: text,
    instructions:
      "Read this like a calm, experienced interview coach giving measured feedback.",
  });

  const arrayBuffer = await response.arrayBuffer();

  return {
    mimeType: "audio/mpeg",
    base64Audio: Buffer.from(arrayBuffer).toString("base64"),
  };
}

export { EVALUATOR_PROMPT_VERSION };
