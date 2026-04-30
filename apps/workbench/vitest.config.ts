import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "workbench",
    environment: "node",
    globals: true,
    include: [
      "src/**/*.test.{ts,tsx}",
      "db/**/*.test.ts",
      "eval/**/*.test.ts",
      "scripts/**/*.test.ts",
      "server/**/*.test.ts",
    ],
  },
});
