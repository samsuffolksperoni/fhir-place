import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: false,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "screenshots",
      testMatch: /.*\.screenshot\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    // Pin the dev server to MSW. Without `VITE_USE_MOCK=true`, the demo's
    // `ACTIVE_SERVER_CONFIG` resolves through `loadActiveServerId()` →
    // `localStorage.getItem("fhir-place:active-server")` → built-in default
    // (SMART Health IT after #338). A developer's local browser state can
    // therefore make the test run hit `https://r4.smarthealthit.org`, where
    // MSW fixtures (Ada Lovelace, the patient compartment) don't exist and
    // every Ada-dependent spec 404s. Pinning the env var forces the
    // `if (USE_MOCK)` branch in `apps/demo/src/config.ts`, which ignores
    // localStorage entirely — see issue #416.
    command: "VITE_USE_MOCK=true pnpm dev",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: true,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
