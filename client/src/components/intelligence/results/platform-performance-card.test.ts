import { describe, expect, it } from "vitest";
import type { PromptResult } from "../types";
import { yourPlatformMetrics } from "./platform-performance-card";

function prompt(results: PromptResult["results"]): PromptResult {
  return { promptId: "p1", promptText: "best CRM", results };
}

describe("yourPlatformMetrics", () => {
  it("derives score, mentions, and citations from real prompt results", () => {
    const results = [
      prompt([
        { platformId: "chatgpt", mentioned: true, summary: "Acme is listed at https://example.com/acme", sentiment: 'positive' },
        { platformId: "claude", mentioned: true, summary: "Acme is recommended", sentiment: 'positive' },
      ]),
      prompt([
        { platformId: "chatgpt", mentioned: false, summary: "Other options are listed", sentiment: null },
        { platformId: "claude", mentioned: true, summary: "Acme appears with https://example.com/review", sentiment: 'positive' },
      ]),
    ];

    expect(yourPlatformMetrics(results, "chatgpt")).toEqual({
      score: 65,
      mentions: 1,
      citationRate: 50,
      sentiment: 'positive',
    });
  });

  it("returns empty metrics when the platform has no results", () => {
    expect(yourPlatformMetrics(undefined, "gemini")).toEqual({
      score: 0,
      mentions: 0,
      citationRate: null,
      sentiment: null,
    });
  });
});
