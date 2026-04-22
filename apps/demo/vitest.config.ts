import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "demo",
    environment: "node",
    globals: true,
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
