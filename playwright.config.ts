import { defineConfig, devices } from "@playwright/test";

/**
 * Password of the admin identity the API seed creates (S20).
 *
 * The seed carries no admin credential of its own (R1-001): it reads
 * `ADMIN_USER_PASSWORD` and creates no admin without it, which would leave every
 * curated-content write answered with 403. The suite therefore supplies one value here
 * — the operator can override it by exporting the same variable — and it is used twice:
 * by the seed (through the API server's environment) and by the specs, which sign in as
 * that admin. Normalizing it here keeps both sides on exactly the same string.
 */
const E2E_ADMIN_PASSWORD =
  process.env.ADMIN_USER_PASSWORD?.trim() || "e2e-admin-password";
process.env.ADMIN_USER_PASSWORD = E2E_ADMIN_PASSWORD;

/**
 * Origin the browser app is served from, and therefore the origin every auth request
 * carries. It is handed to the API as `CORS_ALLOWED_ORIGINS`, which is the product's
 * allowlist: the API grants it CORS with credentials and Better Auth trusts it. One
 * constant, so the served app and the allowed origin cannot drift apart.
 */
const E2E_WEB_ORIGIN = "http://localhost:8082";

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
    baseURL: E2E_WEB_ORIGIN,
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
      // The seed runs first and in the same shell as the server, so the admin identity
      // exists before any spec signs in. `make check-e2e-web` migrates this database
      // immediately before this config is loaded.
      command: "cd apps/api && bun run db:seed && bun run dev",
      url: "http://localhost:8788/health",
      reuseExistingServer: false,
      timeout: 60000,
      env: {
        TURSO_DATABASE_URL: "file:test-e2e.db",
        PORT: "8788",
        ENVIRONMENT: "development",
        ADMIN_USER_PASSWORD: E2E_ADMIN_PASSWORD,
        // The product's own allowlist (S15, S22, S26): the API trusts and grants this
        // origin, and Better Auth uses it as `trustedOrigins`, so the browser flow needs
        // no test-only origin override.
        CORS_ALLOWED_ORIGINS: E2E_WEB_ORIGIN,
      },
    },
    {
      command:
        "cd apps/mobile && EXPO_PUBLIC_API_URL=http://localhost:8788 bun run web --port 8082",
      url: E2E_WEB_ORIGIN,
      reuseExistingServer: false,
      timeout: 60000,
    },
  ],
});
