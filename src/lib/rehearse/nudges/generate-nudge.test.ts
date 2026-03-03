import { describe, expect, it } from "vitest";
import { choosePrimaryNudge } from "@/lib/rehearse/nudges/generate-nudge";

describe("choosePrimaryNudge", () => {
  it("follows the locked nudge priority order", () => {
    expect(
      choosePrimaryNudge(["metric", "ownership", "result", "reflection"]),
    ).toBe("result");
    expect(choosePrimaryNudge(["reflection", "strategic_layer"])).toBe("reflection");
  });
});
