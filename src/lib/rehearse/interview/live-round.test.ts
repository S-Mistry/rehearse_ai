import { describe, expect, it } from "vitest";
import {
  inferCompanyNameFromJd,
  inferRoleTitleFromJd,
} from "@/lib/rehearse/interview/live-round";

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
