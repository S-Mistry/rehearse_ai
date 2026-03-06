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
    expect(result.feedback.verdict).toBe("Needs work");
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

  it("keeps generic leadership keyword answers weak on action", () => {
    const question = questionBank.find((item) => item.code === "Q1");
    if (!question) {
      throw new Error("Expected Q1 in the question bank.");
    }

    const transcript =
      "I led a challenging launch and managed the team. I prioritized what mattered and we got it done successfully.";
    const result = evaluateAnswerHeuristically({
      question,
      transcript,
      seniorityLevel: "senior",
      seniorityMultiplier: seniorityConfig.senior.multiplier,
      deliveryMetrics: computeDeliveryMetrics(transcript, 45),
      previousAttempts: [],
      cvSummary: null,
      jdSummary: null,
    });

    expect(result.evaluation.criterionAssessment.action.status).toBe("weak");
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

  it("recognizes qualitative deadline and renewal outcomes as covered results", () => {
    const question = questionBank.find((item) => item.code === "Q8");
    if (!question) {
      throw new Error("Expected Q8 in the question bank.");
    }

    const transcript =
      "During our busiest quarter, I owned sequencing across product and engineering. I deferred lower-value migration work instead of squeezing everything into one release because missing the renewal would have hit revenue immediately. We kept the renewal, met the deadline, and finished cleanup later without customer impact.";
    const result = evaluateAnswerHeuristically({
      question,
      transcript,
      seniorityLevel: "lead_principal",
      seniorityMultiplier: seniorityConfig.lead_principal.multiplier,
      deliveryMetrics: computeDeliveryMetrics(transcript, 70),
      previousAttempts: [],
      cvSummary: null,
      jdSummary: null,
    });

    expect(result.evaluation.criterionAssessment.result.status).toBe("covered");
    expect(result.evaluation.criterionAssessment.metric.status).toBe("missing");
  });

  it("keeps vague success claims as weak results", () => {
    const question = questionBank.find((item) => item.code === "Q1");
    if (!question) {
      throw new Error("Expected Q1 in the question bank.");
    }

    const transcript =
      "When things got difficult, I worked hard with the team and it worked out successfully.";
    const result = evaluateAnswerHeuristically({
      question,
      transcript,
      seniorityLevel: "mid_ic",
      seniorityMultiplier: seniorityConfig.mid_ic.multiplier,
      deliveryMetrics: computeDeliveryMetrics(transcript, 38),
      previousAttempts: [],
      cvSummary: null,
      jdSummary: null,
    });

    expect(result.evaluation.criterionAssessment.result.status).toBe("weak");
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

  it("maps capped scores to the new verdict labels and exposes a score explanation", () => {
    const question = questionBank.find((item) => item.code === "Q1");
    if (!question) {
      throw new Error("Expected Q1 in the question bank.");
    }

    const transcript =
      "When a vendor delay put our launch at risk, I was responsible for recovering the timeline without cutting compliance. I mapped the critical path, ran daily decisions with engineering, and shipped on time. As a result, onboarding dropped from seven days to five. I learned to surface trade-offs earlier.";
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

    expect(result.feedback.verdict).toBe("Good answer");
    expect(result.feedback.scoreExplanation).toContain("3/5");
  });

  it("marks transferable learning as covered reflection without requiring explicit next-time phrasing", () => {
    const question = questionBank.find((item) => item.code === "Q3");
    if (!question) {
      throw new Error("Expected Q3 in the question bank.");
    }

    const transcript =
      "I shipped a release with an unvalidated dependency and it failed in production. I owned the miss, rebuilt the release checklist with QA and support, and cut repeat incidents from four in a month to zero in the next two months. I learned that reliability improves when we validate dependencies before scope lock rather than treating them as implementation detail.";
    const result = evaluateAnswerHeuristically({
      question,
      transcript,
      seniorityLevel: "mid_ic",
      seniorityMultiplier: seniorityConfig.mid_ic.multiplier,
      deliveryMetrics: computeDeliveryMetrics(transcript, 80),
      previousAttempts: [],
      cvSummary: null,
      jdSummary: null,
    });

    expect(result.evaluation.criterionAssessment.reflection.status).toBe("covered");
  });

  it("does not under-read ownership, action, or resistance in the supplied conflict example", () => {
    const question = questionBank.find((item) => item.code === "Q2");
    if (!question) {
      throw new Error("Expected Q2 in the question bank.");
    }

    const transcript =
      "I was managing a team that were introducing changes to an investment process. We scoped a new process that turned the investment decision around in 48 hours instead of four weeks. That created challenges for an adjacent team because their workload increased, so I met with the lead of that team and we discussed some options. We created a community for senior portfolio companies to coach founders and shifted the final pitch review closer to the pitch itself. That kept the faster process in place, cut operational overhead by over 500k, and the founders were happier because they received feedback much faster.";
    const result = evaluateAnswerHeuristically({
      question,
      transcript,
      seniorityLevel: "manager_director",
      seniorityMultiplier: seniorityConfig.manager_director.multiplier,
      deliveryMetrics: computeDeliveryMetrics(transcript, 90),
      previousAttempts: [],
      cvSummary: null,
      jdSummary: null,
    });

    expect(result.evaluation.criterionAssessment.ownership.status).toBe("covered");
    expect(result.evaluation.criterionAssessment.action.status).toBe("covered");
    expect(result.evaluation.criterionAssessment.resistance.status).toBe("covered");
    expect(result.feedback.improveNext).not.toContain("Make your own contribution unmistakably clear.");
    expect(result.feedback.improveNext).not.toContain(
      "Show the resistance or pushback you had to work through.",
    );
    expect(result.feedback.headline).not.toBe(
      "The project is clear, but the answer needs more about what you personally did.",
    );
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
      "This example maps well to the role.",
    );
    expect(withoutRoleContext.feedback.roleRelevance).toBeUndefined();
    expect(withRoleContext.evaluation.finalContentScoreAfterCaps).toBeGreaterThan(0);
  });
});
