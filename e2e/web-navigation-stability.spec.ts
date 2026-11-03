import { test, expect, type Page } from "@playwright/test";

/**
 * Navigating with the browser buttons must never leave the app behind an error
 * overlay. Going forward used to raise `The wake lock with tag _r_6_ has not
 * activated yet` from expo-keep-awake: its activation is async, and the release that
 * runs when the screen remounts rejects while the sentinel is still pending. The
 * rejection was unhandled, so React surfaced it as an overlay that covers the page.
 */
const PHONE = { width: 390, height: 800 };
const ERROR_TEXT = /Something went wrong|has not activated yet/;

const sheet = (page: Page) => page.getByTestId("program-preview-sheet");
const previewButton = (page: Page) =>
  page.getByRole("button", { name: "Ver qué vas a reflexionar" }).first();

test("going back and forward never leaves the app behind an error overlay", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.setViewportSize(PHONE);
  await page.goto("/reflections");
  await page.getByText("Programas", { exact: true }).click();
  await previewButton(page).click();
  await expect(sheet(page)).toBeVisible({ timeout: 30000 });

  await page.goBack();
  await expect(sheet(page)).toHaveCount(0);

  await page.goForward();

  await expect(page.getByText(ERROR_TEXT)).toHaveCount(0);
  await expect(page.getByText("Programas", { exact: true })).toBeVisible();
});
