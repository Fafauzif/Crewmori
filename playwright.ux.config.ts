import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e", testMatch: /ux-.*\.spec\.ts/, timeout: 45000, workers: 1,
  outputDir: process.env.CREWMORI_UX_RESULTS || "/tmp/crewmori-ux-results",
  reporter: [["list"], ["json", { outputFile: process.env.CREWMORI_UX_REPORT || "/tmp/crewmori-ux-results/report.json" }]],
  use: {
    baseURL: process.env.CREWMORI_E2E_ORIGIN, headless: true, actionTimeout: 10000,
    navigationTimeout: 15000, screenshot: "only-on-failure", trace: "retain-on-failure",
    launchOptions: process.env.CREWMORI_CHROMIUM_EXECUTABLE ? { executablePath: process.env.CREWMORI_CHROMIUM_EXECUTABLE, args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--no-zygote"] } : undefined,
  },
});
