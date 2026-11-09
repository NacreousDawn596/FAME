import { defineConfig } from "@playwright/test";

// End-to-end tests run against a live FAME stack. See docs/deployment.md.
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: 1,
  use: {
    // Base URL of the reverse proxy (or frontend service).
    baseURL: process.env.FAME_E2E_BASE_URL ?? "http://localhost:8080",
    trace: "on-first-retry",
  },
});
