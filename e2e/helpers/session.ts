import { expect, type Page } from "@playwright/test";

/**
 * Signing in as the seeded admin, shared by every spec that needs a session.
 *
 * Curated-content writes are admin-only (`requireRole("admin")`, S6) and the app tree
 * itself is behind the session gate (S13), so a browser with no session sees the sign-in
 * form instead of the screen under test. The credential is the one
 * `playwright.config.ts` normalized for this run: it seeds the admin identity the API
 * serves and hands the specs the same value, because a spec that guessed a different one
 * would fail at sign-in instead of at the assertion.
 */
export function adminCredentials(): { email: string; password: string } {
  const password = process.env.ADMIN_USER_PASSWORD;
  if (!password) {
    throw new Error(
      "ADMIN_USER_PASSWORD is not set for this run: playwright.config.ts supplies it together with the API seed.",
    );
  }
  // The seeded admin identity (S20); kept in step with the API's ADMIN_USER_EMAIL.
  return { email: "admin@example.com", password };
}

/**
 * Signs the browser in through the real form and waits for the gate to open.
 *
 * The waits are on the form itself rather than on a timeout: filling a field that is not
 * on screen yet would race the database-and-session bootstrap that runs before the gate
 * decides which tree to render.
 */
export async function signInAsAdmin(page: Page): Promise<void> {
  const { email, password } = adminCredentials();

  await page.goto("/sign-in");
  const emailInput = page.getByLabel("Email address");
  await expect(emailInput).toBeVisible({ timeout: 15000 });
  await emailInput.fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();

  // The gate swaps the tree, so the form leaving is the sign-in landing.
  await expect(page.getByLabel("Email address")).toHaveCount(0, {
    timeout: 15000,
  });
}
