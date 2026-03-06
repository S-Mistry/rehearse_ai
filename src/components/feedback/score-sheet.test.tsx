// @vitest-environment jsdom

import React from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { AttemptFeedback, EvaluationResult } from "@/types/rehearse";
import { ScoreSheet } from "@/components/feedback/score-sheet";

function buildEvaluation(overrides: Partial<EvaluationResult> = {}): EvaluationResult {
  return {
    contentScoreRaw: 3,
    finalContentScoreAfterCaps: 3,
    weightedContentScore: 3.6,
    weightedContentMax: 6,
    deliveryScore: 4,
    criterionAssessment: {
      situation: { status: "covered", reason: "ok", evidence: "When...", qualityScore: 2 },
      task: { status: "covered", reason: "ok", evidence: "I owned...", qualityScore: 2 },
      action: { status: "covered", reason: "ok", evidence: "I changed...", qualityScore: 2 },
      result: { status: "covered", reason: "ok", evidence: "It improved.", qualityScore: 2 },
      metric: { status: "covered", reason: "ok", evidence: "20%.", qualityScore: 2 },
      ownership: { status: "covered", reason: "ok", evidence: "I led.", qualityScore: 2 },
      reflection: { status: "weak", reason: "thin", evidence: "I learned.", qualityScore: 1 },
      tradeoff: { status: "weak", reason: "thin", evidence: "Instead of...", qualityScore: 1 },
      resistance: { status: "covered", reason: "ok", evidence: "Pushback.", qualityScore: 2 },
      strategic_layer: { status: "covered", reason: "ok", evidence: "Business impact.", qualityScore: 2 },
    },
    starAssessment: {
      situation: { status: "covered", reason: "ok", evidence: "When...", qualityScore: 2 },
      task: { status: "covered", reason: "ok", evidence: "I owned...", qualityScore: 2 },
      action: { status: "covered", reason: "ok", evidence: "I changed...", qualityScore: 2 },
      result: { status: "covered", reason: "ok", evidence: "It improved.", qualityScore: 2 },
    },
    missingComponents: [],
    strengths: ["clear STAR structure"],
    nudges: [],
    capsApplied: [],
    contentReasoning: {
      structure: "ok",
      ownership: "ok",
      metrics: "ok",
      tradeoffs: "thin",
      reflection: "thin",
    },
    deliveryReasoning: {
      clarity: "Clear.",
      pacing: "Steady.",
      fillerAssessment: "Controlled.",
      conciseness: "Focused.",
    },
    roleRelevance: undefined,
    ...overrides,
  };
}

function buildFeedback(overrides: Partial<AttemptFeedback> = {}): AttemptFeedback {
  return {
    verdict: "Good answer",
    headline: "Clear, convincing example. To move it from good to strong, add the trade-off.",
    scoreExplanation:
      "All STAR sections are covered. This stays at 3/5 because the trade-off and reflection are still not strong enough.",
    strengths: [
      "You gave the story a clear STAR shape.",
      "You sounded like the person who drove the work.",
    ],
    improveNext: [
      "Explain the trade-off you had to navigate.",
      "Close with what you learned or would repeat next time.",
    ],
    deliverySummary: "Clear and focused.",
    retryPrompt: "Try again and explain the trade-off you had to make and why you chose that path.",
    starCoverage: {
      situation: "covered",
      task: "covered",
      action: "covered",
      result: "covered",
    },
    missingElements: [],
    cvLeverage: ["You could have referenced a 20% improvement."],
    spokenRecap: "Good answer.",
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
});

describe("ScoreSheet", () => {
  it("shows the qualitative band, numeric score, and explanation", () => {
    render(<ScoreSheet evaluation={buildEvaluation()} feedback={buildFeedback()} />);

    expect(screen.getByText("Good answer")).toBeTruthy();
    expect(screen.getByText("3/5")).toBeTruthy();
    expect(screen.getByText("Content score")).toBeTruthy();
    expect(
      screen.getByText(
        "All STAR sections are covered. This stays at 3/5 because the trade-off and reflection are still not strong enough.",
      ),
    ).toBeTruthy();
  });

  it("renders semantic bullet lists for worked, improve next, and evidence", () => {
    render(<ScoreSheet evaluation={buildEvaluation()} feedback={buildFeedback()} />);

    const workedSection = screen.getByText("What worked").parentElement;
    const improveSection = screen.getByText("What to improve").parentElement;
    const evidenceSection = screen.getByText("Evidence from your background").parentElement;

    expect(workedSection).toBeTruthy();
    expect(improveSection).toBeTruthy();
    expect(evidenceSection).toBeTruthy();

    expect(within(workedSection as HTMLElement).getAllByRole("listitem").length).toBe(2);
    expect(within(improveSection as HTMLElement).getAllByRole("listitem").length).toBe(2);
    expect(within(evidenceSection as HTMLElement).getAllByRole("listitem").length).toBe(1);
  });
});
