import { describe, expect, it } from "vitest";
import { computeDeliveryMetrics } from "@/lib/rehearse/delivery/metrics";
import { questionBank, seniorityConfig } from "@/lib/rehearse/questions/question-bank";
import {
  applyCaps,
  detectCaps,
  evaluateAnswerHeuristically,
} from "@/lib/rehearse/scoring/evaluate-answer";

describe("evaluate-answer scoring", () => {
  it("applies the strictest cap when multiple caps are present", () => {
    expect(applyCaps(5, ["no_reflection", "no_result"])).toBe(2);
  });

  it("adds senior-plus tradeoff cap and short answer cap deterministically", () => {
    const question = questionBank.find((item) => item.code === "Q1");
    if (!question) {
      throw new Error("Expected Q1 in the question bank.");
    }

    const transcript =
      "When I owned the launch, I led the work and improved the process by 20%.";
    const deliveryMetrics = computeDeliveryMetrics(transcript, 22);
    const caps = detectCaps(
      {
        question,
        transcript,
        seniorityLevel: "senior",
        seniorityMultiplier: seniorityConfig.senior.multiplier,
        deliveryMetrics,
        previousAttempts: [],
        cvSummary: null,
        jdSummary: null,
      },
      ["tradeoff"],
      transcript.toLowerCase(),
    );

    expect(caps).toContain("no_tradeoff_senior_plus");
    expect(caps).toContain("short_answer_cap");
  });

  it("returns a capped score for short answers that miss core result structure", () => {
    const question = questionBank.find((item) => item.code === "Q1");
    if (!question) {
      throw new Error("Expected Q1 in the question bank.");
    }

    const transcript = "I led the project and aligned the team.";
    const result = evaluateAnswerHeuristically({
      question,
      transcript,
      seniorityLevel: "senior",
      seniorityMultiplier: seniorityConfig.senior.multiplier,
      deliveryMetrics: computeDeliveryMetrics(transcript, 20),
      previousAttempts: [],
      cvSummary: null,
      jdSummary: null,
    });

    expect(result.evaluation.finalContentScoreAfterCaps).toBeLessThanOrEqual(2);
    expect(result.evaluation.capsApplied).toContain("short_answer_cap");
    expect(result.feedback.verdict).toBe("Needs more detail");
    expect(result.feedback.improveNext.length).toBeGreaterThan(0);
    expect(result.feedback.starCoverage.result).toBe("missing");
  });

  it("marks the screenshot-style vague answer as weak for situation and action", () => {
    const question = questionBank.find((item) => item.code === "Q1");
    if (!question) {
      throw new Error("Expected Q1 in the question bank.");
    }

    const transcript =
      "I led a challenging project once upon a time when I was in a team that had challenges and I managed to help them solve it.";
    const result = evaluateAnswerHeuristically({
      question,
      transcript,
      seniorityLevel: "senior",
      seniorityMultiplier: seniorityConfig.senior.multiplier,
      deliveryMetrics: computeDeliveryMetrics(transcript, 21),
      previousAttempts: [],
      cvSummary: null,
      jdSummary: null,
    });

    expect(result.evaluation.starAssessment.situation.status).toBe("weak");
    expect(result.evaluation.starAssessment.task.status).toBe("missing");
    expect(result.evaluation.starAssessment.action.status).toBe("weak");
    expect(result.evaluation.starAssessment.result.status).toBe("missing");
    expect(result.feedback.starCoverage.situation).toBe("weak");
    expect(result.feedback.starCoverage.action).toBe("weak");
  });

  it("treats mention-only action as weak instead of covered", () => {
    const question = questionBank.find((item) => item.code === "Q1");
    if (!question) {
      throw new Error("Expected Q1 in the question bank.");
    }

    const transcript = "When the project slipped, I led it.";
    const result = evaluateAnswerHeuristically({
      question,
      transcript,
      seniorityLevel: "senior",
      seniorityMultiplier: seniorityConfig.senior.multiplier,
      deliveryMetrics: computeDeliveryMetrics(transcript, 18),
      previousAttempts: [],
      cvSummary: null,
      jdSummary: null,
    });

    expect(result.evaluation.starAssessment.action.status).toBe("weak");
  });

  it("still marks concise but concrete STAR answers as covered", () => {
    const question = questionBank.find((item) => item.code === "Q1");
    if (!question) {
      throw new Error("Expected Q1 in the question bank.");
    }

    const transcript =
      "When a vendor delay put our onboarding launch at risk, I was responsible for recovering the timeline without cutting compliance. I mapped the critical path, cut two low-value features, and ran daily decisions with engineering and support. As a result, we launched on time, onboarding dropped from seven days to five, and support tickets fell the next week.";
    const result = evaluateAnswerHeuristically({
      question,
      transcript,
      seniorityLevel: "senior",
      seniorityMultiplier: seniorityConfig.senior.multiplier,
      deliveryMetrics: computeDeliveryMetrics(transcript, 85),
      previousAttempts: [],
      cvSummary: null,
      jdSummary: null,
    });

    expect(result.feedback.starCoverage).toEqual({
      situation: "covered",
      task: "covered",
      action: "covered",
      result: "covered",
    });
  });

  it("allows qualitative results to count while still requiring metrics separately", () => {
    const question = questionBank.find((item) => item.code === "Q7");
    if (!question) {
      throw new Error("Expected Q7 in the question bank.");
    }

    const transcript =
      "When handoffs kept breaking between support and operations, I was responsible for fixing the process. I introduced a single intake checklist and reviewed the queue with both teams each morning. As a result, both teams adopted the checklist and complaints stopped showing up in the weekly review.";
    const result = evaluateAnswerHeuristically({
      question,
      transcript,
      seniorityLevel: "mid_ic",
      seniorityMultiplier: seniorityConfig.mid_ic.multiplier,
      deliveryMetrics: computeDeliveryMetrics(transcript, 70),
      previousAttempts: [],
      cvSummary: null,
      jdSummary: null,
    });

    expect(result.evaluation.starAssessment.result.status).toBe("covered");
    expect(result.evaluation.missingComponents).toContain("metric");
  });

  it("prevents very short answers from turning any STAR section green", () => {
    const question = questionBank.find((item) => item.code === "Q1");
    if (!question) {
      throw new Error("Expected Q1 in the question bank.");
    }

    const transcript =
      "When launch slipped, I owned recovery, mapped workstreams, aligned engineering, and shipped on time.";
    const result = evaluateAnswerHeuristically({
      question,
      transcript,
      seniorityLevel: "senior",
      seniorityMultiplier: seniorityConfig.senior.multiplier,
      deliveryMetrics: computeDeliveryMetrics(transcript, 20),
      previousAttempts: [],
      cvSummary: null,
      jdSummary: null,
    });

    expect(Object.values(result.feedback.starCoverage)).not.toContain("covered");
  });

  it("returns sentence-case improvement items and includes delivery coaching", () => {
    const question = questionBank.find((item) => item.code === "Q1");
    if (!question) {
      throw new Error("Expected Q1 in the question bank.");
    }

    const transcript =
      "When I led the launch, I was responsible for coordinating the team and I kept saying um while I explained it.";
    const result = evaluateAnswerHeuristically({
      question,
      transcript,
      seniorityLevel: "senior",
      seniorityMultiplier: seniorityConfig.senior.multiplier,
      deliveryMetrics: {
        ...computeDeliveryMetrics(transcript, 210),
        fillerRate: 6,
        longPauseCount: 3,
        fragmentationScore: 4,
        wordsPerMinute: 185,
      },
      previousAttempts: [],
      cvSummary: null,
      jdSummary: null,
    });

    expect(result.feedback.improveNext).toContain(
      "State the result and what changed because of your work.",
    );
    expect(result.feedback.improveNext).toContain(
      "Cut filler words so the answer sounds more confident.",
    );
    expect(result.feedback.improveNext.every((item) => /^[A-Z]/.test(item))).toBe(true);
  });

  it("adds role relevance feedback only when role context is available", () => {
    const question = questionBank.find((item) => item.code === "Q1");
    if (!question) {
      throw new Error("Expected Q1 in the question bank.");
    }

    const transcript =
      "When I owned the roadmap planning cycle, I aligned stakeholders across product and operations, improved execution clarity, and reduced missed deadlines by 22%.";
    const withRoleContext = evaluateAnswerHeuristically({
      question,
      transcript,
      seniorityLevel: "senior",
      seniorityMultiplier: seniorityConfig.senior.multiplier,
      deliveryMetrics: computeDeliveryMetrics(transcript, 120),
      previousAttempts: [],
      cvSummary: null,
      jdSummary: {
        coreCompetencies: ["Stakeholder management", "Roadmap execution"],
        leadershipExpectationLevel: "high",
        strategicVsExecutionWeight: "balanced",
        stakeholderComplexityLevel: "high",
        performanceKeywords: ["Execution excellence"],
      },
    });
    const withoutRoleContext = evaluateAnswerHeuristically({
      question,
      transcript,
      seniorityLevel: "senior",
      seniorityMultiplier: seniorityConfig.senior.multiplier,
      deliveryMetrics: computeDeliveryMetrics(transcript, 120),
      previousAttempts: [],
      cvSummary: null,
      jdSummary: null,
    });

    expect(withRoleContext.evaluation.roleRelevance?.assessment).toBe("direct_match");
    expect(withRoleContext.feedback.roleRelevance?.headline).toBe(
      "The example feels directly relevant to the role.",
    );
    expect(withoutRoleContext.feedback.roleRelevance).toBeUndefined();
    expect(withRoleContext.evaluation.finalContentScoreAfterCaps).toBeGreaterThan(0);
  });
});
