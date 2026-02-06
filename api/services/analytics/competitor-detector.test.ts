import { describe, expect, it } from "vitest";
import { compareCompetitors } from "./competitor-detector";

describe("compareCompetitors", () => {
  it("counts brand mentions from the structured flag when text uses an alias", () => {
    const responses = [
      { text: "Acme is an option for CRM teams.", platform: "chatgpt", brandMentioned: true },
      { text: "Acme is compared with Orbit Sales.", platform: "claude", brandMentioned: true },
      { text: "Orbit Sales is recommended.", platform: "gemini", brandMentioned: false },
    ];

    const result = compareCompetitors(responses, "Acme Inc.", ["Orbit Sales"]);

    expect(result.brandRank).toBe(1);
    expect(result.summary.brandScore).toBeGreaterThan(0);
    expect(result.competitors[0].mentionRate).toBeLessThan(1);
  });
});
