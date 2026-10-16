import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e", timeout: 120000, workers: 1, fullyParallel: false,
  outputDir: "/tmp/crewmori-e2e-results", reporter: "list",
  use: { baseURL: process.env.CREWMORI_E2E_ORIGIN, headless: true, actionTimeout: 15000, navigationTimeout: 20000, screenshot: "only-on-failure", trace: "retain-on-failure" },
});
