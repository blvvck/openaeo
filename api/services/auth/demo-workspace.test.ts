import { describe, expect, it } from "vitest";
import { demoSlug, isDemoSlugConflict, isDemoWorkspace, isDemoWrite, isOwnedDemoWorkspace } from "./demo-workspace";

describe("demo workspace rules", () => {
  it("derives a stable account-scoped slug", () => {
    expect(demoSlug("user-123")).toBe(demoSlug("user-123"));
    expect(demoSlug("user-123")).not.toBe(demoSlug("user-456"));
    expect(demoSlug("user-123")).toMatch(/^demo-[a-f0-9]{20}$/);
  });

  it("recognizes persisted demo workspaces", () => {
    expect(isDemoWorkspace({ is_demo: true })).toBe(true);
    expect(isDemoWorkspace({ is_demo: false })).toBe(false);
  });

  it("requires the demo marker and matching owner before attachment", () => {
    expect(isOwnedDemoWorkspace({ is_demo: true, owner_id: "user-123" }, "user-123")).toBe(true);
    expect(isOwnedDemoWorkspace({ is_demo: true, owner_id: "user-456" }, "user-123")).toBe(false);
    expect(isOwnedDemoWorkspace({ is_demo: false, owner_id: "user-123" }, "user-123")).toBe(false);
  });

  it("blocks every mutating HTTP method while allowing reads", () => {
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      expect(isDemoWrite(method)).toBe(true);
    }
    for (const method of ["GET", "HEAD", "OPTIONS"]) {
      expect(isDemoWrite(method)).toBe(false);
    }
  });

  it("only treats workspace slug uniqueness as a provisioning race", () => {
    expect(isDemoSlugConflict({ code: "P2002", meta: { target: ["slug"] } })).toBe(true);
    expect(isDemoSlugConflict({ code: "P2002", meta: { target: ["name"] } })).toBe(false);
    expect(isDemoSlugConflict({ code: "P2025" })).toBe(false);
  });
});
