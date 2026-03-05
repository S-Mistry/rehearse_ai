import { describe, expect, it } from "vitest";
import type { EvaluationResult } from "@/types/rehearse";
import {
  buildFollowUpQuestion,
  inferCompanyNameFromJd,
  inferRoleTitleFromJd,
  shouldAskFollowUp,
} from "@/lib/rehearse/interview/live-round";

function buildEvaluation(
  overrides: Partial<EvaluationResult> = {},
): EvaluationResult {
  return {
    contentScoreRaw: 3,
    finalContentScoreAfterCaps: 3,
    weightedContentScore: 3.6,
    weightedContentMax: 6,
    deliveryScore: 3,
    criterionAssessment: {
      situation: {
        status: "covered",
        reason: "Clear context.",
        evidence: "When the rollout slipped...",
        qualityScore: 2,
      },
      task: {
        status: "covered",
        reason: "Clear responsibility.",
        evidence: "I was responsible for recovering the launch.",
        qualityScore: 2,
      },
      action: {
        status: "covered",
        reason: "Clear actions.",
        evidence: "I mapped the critical path and aligned engineering.",
        qualityScore: 2,
      },
      result: {
        status: "covered",
        reason: "Clear result.",
        evidence: "We launched on time and tickets fell.",
        qualityScore: 2,
      },
      metric: {
        status: "covered",
        reason: "Metric present.",
        evidence: "Tickets fell.",
        qualityScore: 2,
      },
      ownership: {
        status: "covered",
        reason: "Ownership is clear.",
        evidence: "I was responsible.",
        qualityScore: 2,
      },
      reflection: {
        status: "covered",
        reason: "Reflection is clear.",
        evidence: "I learned...",
        qualityScore: 2,
      },
      tradeoff: {
        status: "covered",
        reason: "Trade-off is clear.",
        evidence: "Instead of...",
        qualityScore: 2,
      },
      resistance: {
        status: "covered",
        reason: "Resistance is clear.",
        evidence: "Another team objected.",
        qualityScore: 2,
      },
      strategic_layer: {
        status: "covered",
        reason: "Strategic impact is clear.",
        evidence: "The business benefited.",
        qualityScore: 2,
      },
    },
    starAssessment: {
      situation: {
        status: "covered",
        reason: "Clear context.",
        evidence: "When the rollout slipped...",
        qualityScore: 2,
      },
      task: {
        status: "covered",
        reason: "Clear responsibility.",
        evidence: "I was responsible for recovering the launch.",
        qualityScore: 2,
      },
      action: {
        status: "covered",
        reason: "Clear actions.",
        evidence: "I mapped the critical path and aligned engineering.",
        qualityScore: 2,
      },
      result: {
        status: "covered",
        reason: "Clear result.",
        evidence: "We launched on time and tickets fell.",
        qualityScore: 2,
      },
    },
    missingComponents: [],
    strengths: [],
    nudges: [],
    capsApplied: [],
    contentReasoning: {
      structure: "ok",
      ownership: "ok",
      metrics: "ok",
      tradeoffs: "ok",
      reflection: "ok",
    },
    deliveryReasoning: {
      clarity: "ok",
      pacing: "ok",
      fillerAssessment: "ok",
      conciseness: "ok",
    },
    roleRelevance: {
      assessment: "not_enough_context",
      reasoning: "No role context.",
      bridge: null,
    },
    ...overrides,
  };
}

const question = {
  id: "q1",
  code: "Q1",
  order: 1,
  prompt: "Tell me about a time you led a challenging project.",
  title: "Led a challenging project",
  category: "Leadership",
  rubricVersion: "2026-03-03-v1",
  rubric: {
    mustInclude: ["situation", "task", "action", "result"],
    score5Signals: ["clear scope"],
  },
} as const;

describe("live-round JD heuristics", () => {
  it("does not treat boilerplate headings as a role title", () => {
    const title = inferRoleTitleFromJd(
      [
        "About the job",
        "About Zego",
        "About the role",
        "We are looking for a Director of Product Growth who is a builder.",
      ].join("\n"),
    );

    expect(title).toBeNull();
  });

  it("ignores generic team section labels when inferring company name", () => {
    const company = inferCompanyNameFromJd(
      [
        "Lead & Upskill the Team: You will mentor and coach Product Managers across the team.",
        "Company: Zego",
      ].join("\n"),
    );

    expect(company).toBe("Zego");
  });

  it("still accepts explicit title fields", () => {
    const title = inferRoleTitleFromJd("Job Title: Director of Product Growth");

    expect(title).toBe("Director of Product Growth");
  });
});

describe("live-round follow-up targeting", () => {
  it("asks a follow-up when the result is weak", () => {
    const evaluation = buildEvaluation({
      criterionAssessment: {
        ...buildEvaluation().criterionAssessment,
        result: {
          status: "weak",
          reason: "Outcome is vague.",
          evidence: "It worked better.",
          qualityScore: 1,
        },
      },
      starAssessment: {
        ...buildEvaluation().starAssessment,
        result: {
          status: "weak",
          reason: "Outcome is vague.",
          evidence: "It worked better.",
          qualityScore: 1,
        },
      },
    });

    expect(shouldAskFollowUp(evaluation)).toBe(true);
    expect(buildFollowUpQuestion(question, evaluation)).toBe(
      "What changed because of your work, and how did you know it worked?",
    );
  });

  it("asks a follow-up when two STAR sections are weak", () => {
    const evaluation = buildEvaluation({
      criterionAssessment: {
        ...buildEvaluation().criterionAssessment,
        situation: {
          status: "weak",
          reason: "Context is vague.",
          evidence: "When things were hard.",
          qualityScore: 1,
        },
        action: {
          status: "weak",
          reason: "Actions are vague.",
          evidence: "I led it.",
          qualityScore: 1,
        },
      },
      starAssessment: {
        ...buildEvaluation().starAssessment,
        situation: {
          status: "weak",
          reason: "Context is vague.",
          evidence: "When things were hard.",
          qualityScore: 1,
        },
        action: {
          status: "weak",
          reason: "Actions are vague.",
          evidence: "I led it.",
          qualityScore: 1,
        },
      },
    });

    expect(shouldAskFollowUp(evaluation)).toBe(true);
    expect(buildFollowUpQuestion(question, evaluation)).toBe(
      "Walk me through the specific actions you took.",
    );
  });

  it("skips the structural follow-up when STAR sections are covered", () => {
    const evaluation = buildEvaluation({
      finalContentScoreAfterCaps: 4,
    });

    expect(shouldAskFollowUp(evaluation)).toBe(false);
    expect(buildFollowUpQuestion(question, evaluation)).toBeNull();
  });

  it("prefers the highest-impact unresolved criterion once structure is already covered", () => {
    const conflictQuestion = {
      ...question,
      code: "Q2",
      rubric: {
        mustInclude: ["situation", "action", "result", "ownership", "reflection", "resistance"],
        score5Signals: ["clear conflict type"],
      },
    } as const;
    const evaluation = buildEvaluation({
      finalContentScoreAfterCaps: 3,
      capsApplied: ["no_reflection"],
      criterionAssessment: {
        ...buildEvaluation().criterionAssessment,
        reflection: {
          status: "missing",
          reason: "No learning stated.",
          evidence: null,
          qualityScore: 0,
        },
      },
    });

    expect(shouldAskFollowUp(evaluation)).toBe(true);
    expect(buildFollowUpQuestion(conflictQuestion, evaluation)).toBe(
      "What did you learn, and what would you do differently next time?",
    );
  });
});
