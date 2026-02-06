import { describe, expect, it } from "vitest";
import type { ResponseWithMetrics } from "./insights-generator";
import { generateInsights } from "./insights-generator";

const responses: ResponseWithMetrics[] = [
  { text: "Orbit Sales is the leading CRM", platform: "chatgpt", promptText: "best CRM", brandMentioned: false },
  { text: "Orbit Sales is highly rated", platform: "claude", promptText: "best CRM", brandMentioned: false },
];

describe("insight ids", () => {
  it("derives stable ids from the insight's semantic identity", () => {
    const first = generateInsights(responses, "Acme", { competitors: ["Orbit Sales"] });
    const second = generateInsights(responses, "Acme", { competitors: ["Orbit Sales"] });

    expect(first.insights.length).toBeGreaterThan(0);
    expect(first.insights.map((insight) => insight.id)).toEqual(second.insights.map((insight) => insight.id));
  });

  it("changes the id when the insight subject changes", () => {
    const first = generateInsights(responses, "Acme", { competitors: ["Orbit Sales"] });
    const otherResponses = responses.map((response) => ({
      ...response,
      text: response.text.replace("Orbit Sales", "Northstar CRM"),
    }));
    const second = generateInsights(otherResponses, "Acme", { competitors: ["Northstar CRM"] });
    const firstGap = first.insights.find((insight) => insight.category === "content_gap");
    const secondGap = second.insights.find((insight) => insight.category === "content_gap");

    expect(firstGap).toBeDefined();
    expect(secondGap).toBeDefined();
    expect(firstGap?.id).not.toBe(secondGap?.id);
  });
});
