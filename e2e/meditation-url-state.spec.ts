import { test, expect, type Page } from "@playwright/test";

/**
 * The reading shown during a meditation session travels in the address, so "leé
 * esto" is a link. The identity is the reading's id, not its position: the screen
 * selects from the readings that are still unread first.
 */
const PHONE = { width: 390, height: 800 };
const TITLE = "meditation-reading-title";

const readingTitle = (page: Page) => page.getByTestId(TITLE);

async function openMeditation(page: Page) {
  await page.setViewportSize(PHONE);
  await page.goto("/meditation");
  await expect(readingTitle(page)).toBeVisible({ timeout: 30000 });
}

test("the reading on screen puts itself in the address", async ({ page }) => {
  test.setTimeout(120000);
  await openMeditation(page);

  await expect(page).toHaveURL(/[?&]lectura=[^&]+/);
  const shown = await readingTitle(page).innerText();

  // The address has to reproduce what is on screen, not something else.
  const shared = page.url();
  await page.goto(shared);
  await expect(readingTitle(page)).toHaveText(shown, { timeout: 30000 });
});

test("a shared address opens that reading", async ({ page }) => {
  test.setTimeout(120000);
  await openMeditation(page);

  const current = await readingTitle(page).innerText();
  const shared = page.url();
  const id = new URL(shared).searchParams.get("lectura");

  // A different reading, so the assertion cannot pass by accident.
  await page.goto("/meditation");
  await expect(readingTitle(page)).toHaveText(current, { timeout: 30000 });

  await page.goto(`/meditation?lectura=${id}`);
  await expect(readingTitle(page)).toHaveText(current, { timeout: 30000 });
  await expect(page).toHaveURL(new RegExp(`lectura=${id}`));
});

test("an unknown reading leaves the current selection alone", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.setViewportSize(PHONE);
  await page.goto("/meditation?lectura=does-not-exist");

  // The screen still shows a reading, with no error, and the address stops naming
  // the one that does not exist.
  await expect(readingTitle(page)).toBeVisible({ timeout: 30000 });
  await expect(page).not.toHaveURL(/lectura=does-not-exist/);
});
