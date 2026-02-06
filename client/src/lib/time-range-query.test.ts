import { describe, expect, it } from "vitest";
import type { TimeRange, TimeRangePreset } from "@/components/charts/time-range-selector";
import { timeRangeQuery } from "./time-range-query";

function range(preset: TimeRangePreset): TimeRange {
  return {
    preset,
    from: new Date("2026-01-01T00:00:00.000Z"),
    to: new Date("2026-01-31T00:00:00.000Z"),
  };
}

describe("timeRangeQuery", () => {
  it("does not send dates for fixed presets", () => {
    expect(timeRangeQuery(range("30d"))).toBe("");
  });

  it("sends both date shapes for custom ranges", () => {
    const query = timeRangeQuery(range("custom"));
    expect(query).toContain("startDate=2026-01-01T00%3A00%3A00.000Z");
    expect(query).toContain("from=2026-01-01T00%3A00%3A00.000Z");
  });

  it("sends explicit dates for all time", () => {
    expect(timeRangeQuery(range("all"))).toContain("endDate=2026-01-31T00%3A00%3A00.000Z");
  });
});
