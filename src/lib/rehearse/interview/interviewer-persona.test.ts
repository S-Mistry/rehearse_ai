import { describe, expect, it } from "vitest";
import {
  buildInterviewerFeedback,
  buildInterviewerFollowUp,
  buildInterviewerIntro,
  interviewerName,
  interviewerVoice,
} from "@/lib/rehearse/interview/interviewer-persona";

describe("interviewer persona helper", () => {
  it("builds a generic intro without JD-derived context", () => {
    const intro = buildInterviewerIntro({
      prompt: "Tell me about a time you led a challenging project.",
    });

    expect(intro).toContain(`Hi, I'm ${interviewerName}.`);
    expect(intro).toContain("First question: Tell me about a time you led a challenging project.");
    expect(intro).not.toContain("About Zego");
  });

  it("wraps follow-up and feedback lines consistently", () => {
    expect(buildInterviewerFollowUp("What changed because of your work?")).toBe(
      "Thanks. One follow-up before I score it: What changed because of your work?",
    );
    expect(buildInterviewerFeedback("Strong answer.")).toBe(
      "Here's my feedback. Strong answer.",
    );
    expect(interviewerVoice).toBe("marin");
  });
});
