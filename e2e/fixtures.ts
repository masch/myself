import { test as base } from "@playwright/test";
import { signInAsAdmin } from "./helpers/session";

/**
 * The `test` for specs that need a signed-in browser.
 *
 * The root session gate (S13) sends an unauthenticated client to the sign-in form, so a
 * spec that opens a screen directly would assert against the gate instead of the screen.
 * This fixture signs in as the seeded admin once per test, before the test body runs, and
 * the session lives in the browser's cookie jar, so the spec's own `page.goto` stays
 * authenticated (T5 landed the credentialed CORS allowlist that makes that possible).
 *
 * Specs adopt it with one import line and change nothing else:
 *
 *     import { test, expect } from "./fixtures";
 *
 * `e2e/reading-flow.spec.ts` deliberately does not use it: one of its tests proves what
 * the gate does to a client with no session.
 */
export const test = base.extend<{ authenticatedSession: void }>({
  authenticatedSession: [
    async ({ page }, use) => {
      await signInAsAdmin(page);
      await use();
    },
    { auto: true },
  ],
});

export { expect } from "@playwright/test";
