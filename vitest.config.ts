import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "json-summary", "lcov"],
      reportsDirectory: "coverage/unit",
      include: ["src/**/*.{ts,tsx,js}"],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.test.tsx",
        "src/**/*.d.ts",
        "src/vite-env.d.ts",
        "src/types.ts",
        "src/styles.css"
      ],
      thresholds: {
        lines: 30,
        functions: 34,
        branches: 24,
        statements: 30
      }
    }
  }
});
