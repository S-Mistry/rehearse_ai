import type {
  DeliveryMetrics,
  EvaluationResult,
  EvaluationProvider,
  ExtractionProvider,
  JdProfileStructured,
  ModerationResult,
  SpeechPayload,
  TranscriptProvider,
} from "@/types/rehearse";
import type { CvProfileStructured, EvaluationInput, MissingComponent } from "@/types/rehearse";
import { appMode } from "@/lib/env";
import { getOpenAIClient } from "@/lib/openai/client";
import { moderateLocally } from "@/lib/rehearse/safety/moderation";
import { extractCvLocally, extractJdLocally } from "@/lib/rehearse/parsers/structured-extraction";
import { buildEvaluatorPrompt, EVALUATOR_PROMPT_VERSION } from "@/lib/rehearse/prompts/evaluator";
import { CV_EXTRACTION_PROMPT, JD_EXTRACTION_PROMPT, PARSER_PROMPT_VERSION } from "@/lib/rehearse/prompts/parsers";
import { buildNudge } from "@/lib/rehearse/nudges/generate-nudge";
import {
  applyCaps,
  buildAttemptFeedback,
  detectCaps,
  detectMissingComponents,
  evaluateAnswerHeuristically,
  roundWeightedScore,
} from "@/lib/rehearse/scoring/evaluate-answer";
import {
  cvProfileStructuredSchema,
  evaluationResultSchema,
  jdProfileStructuredSchema,
} from "@/types/rehearse";
import { zodTextFormat } from "openai/helpers/zod";

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
    return {
      transcript: manualTranscript.trim(),
      provider: "manual-transcript" as TranscriptProvider,
    };
  }

  if (!file || !appMode.hasOpenAI) {
    return {
      transcript: "",
      provider: "manual-transcript" as TranscriptProvider,
    };
  }

  const client = getOpenAIClient();
  if (!client) {
    return {
      transcript: "",
      provider: "manual-transcript" as TranscriptProvider,
    };
  }

  const result = await client.audio.transcriptions.create({
    file,
    model: "gpt-4o-transcribe",
  });

  return {
    transcript: result.text.trim(),
    provider: "gpt-4o-transcribe" as TranscriptProvider,
  };
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
  provider: EvaluationProvider;
  modelName: string;
  promptVersion: string;
}> {
  if (!appMode.hasOpenAI) {
    const fallback = evaluateAnswerHeuristically(input);
    return {
      ...fallback,
      provider: "fallback:heuristic",
      modelName: "heuristic",
      promptVersion: EVALUATOR_PROMPT_VERSION,
    };
  }

  const client = getOpenAIClient();
  if (!client) {
    const fallback = evaluateAnswerHeuristically(input);
    return {
      ...fallback,
      provider: "fallback:heuristic",
      modelName: "heuristic",
      promptVersion: EVALUATOR_PROMPT_VERSION,
    };
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
      const fallback = evaluateAnswerHeuristically(input);
      return {
        ...fallback,
        provider: "fallback:heuristic",
        modelName: "heuristic",
        promptVersion: EVALUATOR_PROMPT_VERSION,
      };
    }

    const evaluation = normalizeModelEvaluation(input, parsed);
    const feedback = buildAttemptFeedback(evaluation, input);

    return {
      evaluation,
      feedback,
      provider: "openai:gpt-4.1",
      modelName: "gpt-4.1",
      promptVersion: EVALUATOR_PROMPT_VERSION,
    };
  } catch {
    const fallback = evaluateAnswerHeuristically(input);
    return {
      ...fallback,
      provider: "fallback:heuristic",
      modelName: "heuristic",
      promptVersion: EVALUATOR_PROMPT_VERSION,
    };
  }
}

export async function extractCvProfile(rawText: string): Promise<{
  structured: CvProfileStructured;
  warnings: string[];
  provider: ExtractionProvider;
}> {
  const local = extractCvLocally(rawText);
  if (!appMode.hasOpenAI) {
    return { ...local, provider: "fallback:local-parser" };
  }

  const client = getOpenAIClient();
  if (!client) {
    return { ...local, provider: "fallback:local-parser" };
  }

  try {
    const response = await client.responses.parse({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: "Return structured JSON only for the uploaded CV.",
        },
        {
          role: "user",
          content: `${CV_EXTRACTION_PROMPT}\n\nCV TEXT:\n${rawText}`,
        },
      ],
      text: {
        format: zodTextFormat(cvProfileStructuredSchema, "cv_profile"),
      },
    });

    const parsed = response.output_parsed;
    if (!parsed) {
      return { ...local, provider: "fallback:local-parser" };
    }

    return {
      structured: parsed,
      warnings: buildExtractionWarnings("cv", parsed, local.warnings),
      provider: "openai:gpt-4.1-mini",
    };
  } catch {
    return { ...local, provider: "fallback:local-parser" };
  }
}

export async function extractJdProfile(rawText: string): Promise<{
  structured: JdProfileStructured;
  warnings: string[];
  provider: ExtractionProvider;
}> {
  const local = extractJdLocally(rawText);
  if (!appMode.hasOpenAI) {
    return { ...local, provider: "fallback:local-parser" };
  }

  const client = getOpenAIClient();
  if (!client) {
    return { ...local, provider: "fallback:local-parser" };
  }

  try {
    const response = await client.responses.parse({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: "Return structured JSON only for the uploaded job description.",
        },
        {
          role: "user",
          content: `${JD_EXTRACTION_PROMPT}\n\nJOB DESCRIPTION TEXT:\n${rawText}`,
        },
      ],
      text: {
        format: zodTextFormat(jdProfileStructuredSchema, "jd_profile"),
      },
    });

    const parsed = response.output_parsed;
    if (!parsed) {
      return { ...local, provider: "fallback:local-parser" };
    }

    return {
      structured: parsed,
      warnings: buildExtractionWarnings("jd", parsed, local.warnings),
      provider: "openai:gpt-4.1-mini",
    };
  } catch {
    return { ...local, provider: "fallback:local-parser" };
  }
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
export { PARSER_PROMPT_VERSION };

function normalizeModelEvaluation(
  input: EvaluationInput,
  parsed: EvaluationResult,
): EvaluationResult {
  const normalizedTranscript = input.transcript.trim().toLowerCase();
  const heuristicMissing = detectMissingComponents(normalizedTranscript, input.question.code);
  const missingComponents =
    parsed.missingComponents.length > 0 ? parsed.missingComponents : heuristicMissing;
  const capsApplied = detectCaps(input, missingComponents, normalizedTranscript);
  const finalContentScoreAfterCaps = normalizeTopScore(
    applyCaps(parsed.contentScoreRaw, capsApplied),
    missingComponents,
  );

  return {
    ...parsed,
    missingComponents,
    capsApplied,
    nudges: missingComponents.length > 0 ? [buildNudge(input.question, parsed.strengths, missingComponents)] : [],
    finalContentScoreAfterCaps,
    weightedContentScore: roundWeightedScore(
      finalContentScoreAfterCaps * input.seniorityMultiplier,
    ),
    weightedContentMax: roundWeightedScore(5 * input.seniorityMultiplier),
  };
}

function normalizeTopScore(
  score: 1 | 2 | 3 | 4 | 5,
  missing: MissingComponent[],
): 1 | 2 | 3 | 4 | 5 {
  if (missing.length === 0) {
    return score;
  }

  return Math.min(score, 4) as 1 | 2 | 3 | 4 | 5;
}

function buildExtractionWarnings(
  kind: "cv" | "jd",
  structured: CvProfileStructured | JdProfileStructured,
  fallbackWarnings: string[],
) {
  const warnings = new Set(fallbackWarnings);

  if (kind === "cv") {
    const cv = structured as CvProfileStructured;
    if (cv.roles.length === 0) {
      warnings.add("No role lines were confidently detected.");
    }
    if (cv.quantifiedAchievements.length === 0) {
      warnings.add("No quantified achievements were confidently detected.");
    }
  }

  if (kind === "jd") {
    const jd = structured as JdProfileStructured;
    if (jd.coreCompetencies.length === 0) {
      warnings.add("No obvious competency keywords were detected.");
    }
  }

  return Array.from(warnings);
}
