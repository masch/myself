import { test, expect } from "@playwright/test";

/**
 * Copying a producer's simulation link.
 *
 * The two-producer simulation works by opening the barter screen with the
 * producer reference in the URL, so the screen hands that link out per producer
 * instead of making the operator build it by hand.
 */
test.describe("E2E barter producer link copy", () => {
  test.use({ permissions: ["clipboard-read", "clipboard-write"] });

  test("copies the link of a producer other than the active one", async ({
    page,
  }) => {
    test.setTimeout(120000);

    await page.goto("/barter?producerId=sabado");
    await expect(page.getByTestId("active-producer-name")).toHaveText(
      "Vermut Sabado",
      { timeout: 30000 },
    );

    const origin = new URL(page.url()).origin;

    await page.getByTestId("copy-link-naturaleza-viva").click();

    await expect(
      page.getByText("Link de Naturaleza Viva copiado"),
    ).toBeVisible();

    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toBe(`${origin}/barter?producerId=naturaleza-viva`);

    // Copying is not switching: the operator keeps its own identity.
    await expect(page.getByTestId("active-producer-name")).toHaveText(
      "Vermut Sabado",
    );
  });
});
