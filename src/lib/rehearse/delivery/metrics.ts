import type { DeliveryMetrics } from "@/types/rehearse";
import { clamp } from "@/lib/utils";

const fillerLexicon = [
  "um",
  "uh",
  "like",
  "you know",
  "sort of",
  "kind of",
  "basically",
  "actually",
];

export function computeDeliveryMetrics(
  transcript: string,
  durationSeconds: number,
): DeliveryMetrics {
  const normalized = transcript.toLowerCase();
  const words = normalized.match(/\b[\w'-]+\b/g) ?? [];
  const fillerCount = fillerLexicon.reduce((count, filler) => {
    const matcher = new RegExp(`\\b${filler.replace(" ", "\\s+")}\\b`, "g");
    return count + (normalized.match(matcher)?.length ?? 0);
  }, 0);

  const wordCount = words.length;
  const fillerRate = wordCount > 0 ? (fillerCount / wordCount) * 100 : 0;
  const wordsPerMinute = durationSeconds > 0 ? (wordCount / durationSeconds) * 60 : 0;
  const pauseEvents = estimatePauseEvents(words, durationSeconds);
  const fragmentationScore = estimateFragmentation(transcript);

  return {
    durationSeconds,
    wordCount,
    fillerCount,
    fillerRate: roundMetric(fillerRate),
    wordsPerMinute: roundMetric(wordsPerMinute),
    longPauseCount: pauseEvents.length,
    pauseEvents,
    fragmentationScore,
  };
}

export function scoreDelivery(metrics: DeliveryMetrics): 1 | 2 | 3 | 4 | 5 {
  if (
    metrics.wordCount < 20 ||
    metrics.fragmentationScore >= 85 ||
    metrics.wordsPerMinute < 70
  ) {
    return 1;
  }

  if (
    metrics.fillerRate >= 8 ||
    metrics.longPauseCount >= 5 ||
    metrics.fragmentationScore >= 65
  ) {
    return 2;
  }

  if (
    metrics.fillerRate >= 4.5 ||
    metrics.longPauseCount >= 3 ||
    metrics.wordsPerMinute > 190 ||
    metrics.wordsPerMinute < 100
  ) {
    return 3;
  }

  if (
    metrics.fillerRate >= 3 ||
    metrics.longPauseCount >= 2 ||
    metrics.wordsPerMinute > 175
  ) {
    return 4;
  }

  return 5;
}

function estimatePauseEvents(words: string[], durationSeconds: number) {
  if (words.length < 60 || durationSeconds < 80) {
    return [];
  }

  const pauses = Math.floor(durationSeconds / 55);
  return Array.from({ length: pauses }).map((_, index) => {
    const startMs = (index + 1) * 42000;
    return {
      startMs,
      endMs: startMs + 2800,
      durationMs: 2800,
    };
  });
}

function estimateFragmentation(transcript: string) {
  const sentenceBreaks = transcript.split(/[.!?]+/).filter(Boolean).length;
  const commas = transcript.split(",").length - 1;
  const words = transcript.match(/\b[\w'-]+\b/g) ?? [];
  const shortBursts = transcript.split(/[.!?]/).filter((part) => {
    const count = part.match(/\b[\w'-]+\b/g)?.length ?? 0;
    return count > 0 && count < 5;
  }).length;

  const score =
    (shortBursts * 15) +
    (sentenceBreaks === 0 ? 25 : 0) +
    (words.length < 40 ? 15 : 0) -
    commas * 2;

  return clamp(score, 0, 100);
}

function roundMetric(value: number) {
  return Math.round(value * 10) / 10;
}
