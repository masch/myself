import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E configuration for full Browser ➔ API ➔ DB flow.
 * Starts the Hono API server and Expo Web server with isolated test databases.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // CI must not pay the full serial timeout cascade when the app breaks: stop
  // after a few distinct failures and cap the whole run, instead of 4 tests ×
  // 120s × 3 attempts silently stretching a red run past half an hour.
  maxFailures: process.env.CI ? 3 : 0,
  globalTimeout: process.env.CI ? 15 * 60 * 1000 : 0,
  reporter: process.env.CI ? [["github"], ["html"]] : "list",
  use: {
    baseURL: "http://localhost:8082",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    timezoneId: "America/Argentina/Buenos_Aires",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command:
        "cd apps/api && TURSO_DATABASE_URL=file:test-e2e.db PORT=8788 bun run dev",
      url: "http://localhost:8788/health",
      reuseExistingServer: false,
      timeout: 30000,
    },
    {
      command:
        "cd apps/mobile && EXPO_PUBLIC_API_URL=http://localhost:8788 bun run web --port 8082",
      url: "http://localhost:8082",
      reuseExistingServer: false,
      timeout: 60000,
    },
  ],
});
