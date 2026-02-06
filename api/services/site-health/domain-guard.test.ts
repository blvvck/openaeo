import { describe, expect, it } from "vitest";
import { assertPublicDomain, fetchPublicText } from "./domain-guard";

describe("site health domain guard", () => {
  it("allows a public address", async () => {
    await expect(assertPublicDomain("8.8.8.8")).resolves.toBe("8.8.8.8");
  });

  it("rejects loopback and private addresses", async () => {
    for (const value of ["127.0.0.1", "10.0.0.1", "192.168.1.1", "169.254.1.1", "[::1]"]) {
      await expect(assertPublicDomain(value)).rejects.toThrow();
    }
  });

  it("rejects local names, ports, and credentials", async () => {
    for (const value of ["localhost", "service.internal", "example.com:8080", "user@example.com"]) {
      await expect(assertPublicDomain(value)).rejects.toThrow();
    }
  });

  it("refuses to fetch a private target", async () => {
    await expect(fetchPublicText("https://127.0.0.1/llms.txt")).rejects.toThrow(/Private addresses|Invalid domain/);
  });
});
