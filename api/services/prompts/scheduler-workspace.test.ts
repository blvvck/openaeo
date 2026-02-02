import { describe, expect, it } from "vitest";
import { canScheduleWorkspace } from "./scheduler-workspace";

describe("prompt scheduler workspace filter", () => {
  it("never schedules Demo workspaces", () => {
    expect(canScheduleWorkspace({ is_demo: true })).toBe(false);
    expect(canScheduleWorkspace({ is_demo: false })).toBe(true);
  });
});
