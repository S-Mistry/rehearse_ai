import { describe, expect, it } from "vitest";
import { inferSeniorityFromJdDocument, mapJdLeadershipToSeniority } from "@/lib/rehearse/seniority";
import type { StoredDocumentProfile } from "@/types/rehearse";

describe("seniority inference", () => {
  it("maps JD leadership levels into session seniority levels", () => {
    expect(mapJdLeadershipToSeniority("director")).toBe("manager_director");
    expect(mapJdLeadershipToSeniority("manager")).toBe("manager_director");
    expect(mapJdLeadershipToSeniority("senior")).toBe("senior");
    expect(mapJdLeadershipToSeniority("individual_contributor")).toBe("mid_ic");
  });

  it("reads the inferred seniority from a stored JD document", () => {
    const jdDocument: StoredDocumentProfile = {
      id: "jd_1",
      userId: "user_1",
      kind: "jd",
      storagePath: null,
      fileName: "jd.txt",
      sourceType: "paste",
      rawText: "Senior Product Manager",
      structuredJson: {
        coreCompetencies: ["leadership"],
        leadershipExpectationLevel: "senior",
        strategicVsExecutionWeight: "strategy-leaning",
        stakeholderComplexityLevel: "high",
        performanceKeywords: ["strategy"],
      },
      parseStatus: "parsed",
      parseWarnings: [],
      provider: "fallback:local-parser",
      createdAt: new Date().toISOString(),
    };

    expect(inferSeniorityFromJdDocument(jdDocument)).toBe("senior");
  });
});
