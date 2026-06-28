import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";

describe("eval 01: schema conformance", () => {
  it("validate.ts passes on the current dataset", () => {
    expect(() => {
      execSync("npx tsx scripts/validate.ts", { stdio: "pipe" });
    }).not.toThrow();
  });
});
