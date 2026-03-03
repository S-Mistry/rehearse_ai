import type { ModerationResult } from "@/types/rehearse";

const unsafePatterns: Array<{ pattern: RegExp; category: string }> = [
  { pattern: /\bkill myself|suicide|self-harm\b/i, category: "self_harm" },
  { pattern: /\bterrorist|bomb making|fraud ring\b/i, category: "illegal_admission" },
  { pattern: /\bslur|racially inferior|ethnic cleansing\b/i, category: "hate" },
];

export function moderateLocally(text: string): ModerationResult {
  const categories = unsafePatterns
    .filter(({ pattern }) => pattern.test(text))
    .map(({ category }) => category);

  if (categories.length === 0) {
    return {
      flagged: false,
      categories: [],
      actionTaken: "allow",
    };
  }

  return {
    flagged: true,
    categories,
    actionTaken: "pause_evaluation",
  };
}
