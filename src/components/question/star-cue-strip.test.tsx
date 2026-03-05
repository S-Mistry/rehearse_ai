// @vitest-environment jsdom

import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { AttemptFeedback } from "@/types/rehearse";
import { StarCueStrip } from "@/components/question/star-cue-strip";

function buildFeedback(
  overrides: Partial<AttemptFeedback> = {},
): AttemptFeedback {
  return {
    verdict: "Good answer",
    headline: "Needs a clearer result.",
    scoreExplanation: "This lands at 3/5 because the result is still too thin.",
    strengths: ["Strong ownership"],
    improveNext: ["State the result and what changed because of your work."],
    deliverySummary: "Delivery was clear.",
    retryPrompt: "Close with the metric and final outcome.",
    starCoverage: {
      situation: "covered",
      task: "weak",
      action: "missing",
      result: "covered",
    },
    missingElements: ["action"],
    spokenRecap: "Good answer.",
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
});

describe("StarCueStrip", () => {
  it("renders covered, weak, and missing states", () => {
    render(<StarCueStrip feedback={buildFeedback()} attemptCount={1} />);

    expect(screen.getAllByText("Covered")).toHaveLength(2);
    expect(screen.getByText("Thin")).toBeTruthy();
    expect(screen.getByText("Missing")).toBeTruthy();
    expect(
      screen.getByText(
        "Green means strong enough. Amber means mentioned but too thin. Gray means missing.",
      ),
    ).toBeTruthy();
  });

  it("tolerates legacy boolean coverage values", () => {
    render(
      <StarCueStrip
        feedback={{
          ...buildFeedback(),
          starCoverage: {
            situation: true,
            task: false,
            action: true,
            result: false,
          } as unknown as AttemptFeedback["starCoverage"],
        }}
        attemptCount={2}
      />,
    );

    expect(screen.getAllByText("Covered")).toHaveLength(2);
    expect(screen.getAllByText("Missing")).toHaveLength(2);
  });
});
