import { expect, test } from "@playwright/test";

/**
 * The two links T6b adds and the form that asks for one (S2, S13).
 *
 * This spec deliberately does not use `./fixtures`: every case here is a browser with **no**
 * session, which is the user a reset or verification link is for, and an auto-sign-in
 * fixture would hide exactly the property being proved — that the root gate lets these
 * routes through instead of swallowing them.
 */
test.describe("password reset and verification links", () => {
  test("asks for a reset without revealing whether the address exists", async ({
    page,
  }) => {
    await page.goto("/sign-in");

    // The entry point is one press from the only screen a signed-out user can reach.
    await page.getByRole("link", { name: "Reset it" }).click();
    await expect(page.getByText("Reset your password")).toBeVisible({
      timeout: 15000,
    });

    // `.last()` because the stack keeps the sign-in screen mounted underneath and both
    // carry the same accessible field name; the pushed screen is the newest one.
    await page
      .getByLabel("Email address")
      .last()
      .fill("nobody-in-this-db@example.com");
    await page.getByRole("button", { name: "Send reset link" }).click();

    // The same sentence is what an existing account would get (the API answers identically
    // in the same time), so the form cannot be used to probe for addresses.
    await expect(page.getByTestId("reset-request-sent")).toContainText(
      "If an account exists",
      { timeout: 15000 },
    );
  });

  test("opens the reset screen from the deep link while signed out", async ({
    page,
  }) => {
    // `myself://reset-password?token=…` on a browser is the same route with the same query.
    await page.goto("/reset-password?token=stub-token-from-a-link");

    // The submit button is labelled "Set new password", so the role locator with an exact
    // name is what keeps the field and the control apart.
    await expect(
      page.getByRole("textbox", { name: "New password", exact: true }),
    ).toBeVisible({ timeout: 15000 });
    // Not the sign-in form: the gate registered this route outside both branches.
    await expect(
      page.getByRole("button", { name: "Send reset link" }),
    ).toHaveCount(0);
  });

  test("reports an expired verification link and still offers the way back", async ({
    page,
  }) => {
    await page.goto("/verify-email?error=TOKEN_EXPIRED");

    const outcome = page.getByTestId("verification-outcome");
    await expect(outcome).toContainText("expired", { timeout: 15000 });
    await expect(outcome).not.toContainText("is verified");

    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByLabel("Email address")).toBeVisible({
      timeout: 15000,
    });
  });
});
