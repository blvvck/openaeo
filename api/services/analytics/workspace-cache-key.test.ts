import { describe, expect, it } from "vitest";
import { workspaceCacheKey } from "./workspace-cache-key";

describe("workspace cache keys", () => {
  it("separates identical queries across workspaces", () => {
    expect(workspaceCacheKey("citations", "real", "overview", "30d"))
      .not.toBe(workspaceCacheKey("citations", "demo", "overview", "30d"));
    expect(workspaceCacheKey("competitors", "real", "metrics", "7d"))
      .not.toBe(workspaceCacheKey("competitors", "real", "metrics", "30d"));
  });
});
