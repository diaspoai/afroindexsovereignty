import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["evals/**/*.test.ts", "scripts/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    pool: "threads",
    environment: "node",
  },
});
