import { test, expect, type Locator, type Page } from "@playwright/test";

/**
 * The gondola view lives in the URL. Two consequences are asserted here, and both
 * fail without the change: the address a producer is looking at reproduces the
 * same page in another phone, and the browser back button reverts a search
 * instead of leaving the screen — because each search that starts is real
 * history, not a component flag the router cannot see.
 *
 * Starting a search pushes the same route, so while a search is active the stack
 * holds two gondola instances and the one on top is the visible one. Every
 * locator here reads `.last()` for that reason.
 */
const PHONE = { width: 360, height: 740 };
const COUNT = /^Góndola de Productores \(\d+\)$/;

const searchInput = (page: Page) =>
  page.getByTestId("gondola-search-input").last();
const filterRow = (page: Page) => page.getByTestId("gondola-filter-row").last();
const producerName = (page: Page) =>
  page.getByTestId("active-producer-name").last();

async function gondolaCount(page: Page): Promise<string> {
  return page.getByText(COUNT).last().innerText();
}

async function openGondola(page: Page) {
  await page.setViewportSize(PHONE);
  await page.goto("/barter?producerId=sabado");
  await expect(producerName(page)).toHaveText("Vermut Sabado", {
    timeout: 30000,
  });
}

/** Waits until the count stops being `previous`, so the assertion is not a snapshot. */
async function expectCountChanged(page: Page, previous: string) {
  await expect
    .poll(() => gondolaCount(page), { timeout: 15000 })
    .not.toBe(previous);
}

test("the search text a producer types becomes the address they can copy", async ({
  page,
}) => {
  test.setTimeout(120000);
  await openGondola(page);
  const unfiltered = await gondolaCount(page);

  await searchInput(page).fill("queso");

  await expect(page).toHaveURL(/[?&]q=queso/);
  await expectCountChanged(page, unfiltered);
  const filtered = await gondolaCount(page);

  // Reload keeps the search: the URL, not the component, is the source of truth.
  await page.reload();
  await expect(searchInput(page)).toHaveValue("queso", { timeout: 30000 });
  await expect(page.getByText(COUNT).last()).toHaveText(filtered);
});

test("a shared address opens the same gondola somewhere else", async ({
  page,
  browser,
}) => {
  test.setTimeout(120000);
  // The address carries the search, the certification, the distance and the
  // producer: this is the link one producer pastes to another.
  const shared = "/barter?producerId=sabado&q=queso&tipo=ORGANIC&km=250";

  await page.setViewportSize(PHONE);
  await page.goto(shared);
  await expect(searchInput(page)).toHaveValue("queso", { timeout: 30000 });
  const expected = await gondolaCount(page);

  // A search hides the producer card, so the producer the link names is proved by
  // clearing it: the card comes back with the producer from the address.
  await page.getByTestId("gondola-search-clear").last().click();
  await expect(producerName(page)).toHaveText("Vermut Sabado");

  // A different browser context is a different user with no stored state.
  const other = await browser.newContext();

  try {
    const otherPage = await other.newPage();
    await otherPage.setViewportSize(PHONE);
    await otherPage.goto(shared);

    await expect(searchInput(otherPage)).toHaveValue("queso", {
      timeout: 30000,
    });
    await expect(otherPage.getByText(COUNT).last()).toHaveText(expected);
    await expect(otherPage).toHaveURL(/[?&]tipo=ORGANIC/);
    await expect(otherPage).toHaveURL(/[?&]km=250/);
  } finally {
    await other.close();
  }
});

test("back reverts the search and keeps the producer on the screen", async ({
  page,
}) => {
  test.setTimeout(120000);
  await openGondola(page);
  const unfiltered = await gondolaCount(page);

  await searchInput(page).fill("queso");
  await expect(page).toHaveURL(/[?&]q=queso/);
  await expectCountChanged(page, unfiltered);

  await page.goBack();

  await expect(searchInput(page)).toHaveValue("");
  await expect
    .poll(() => gondolaCount(page), { timeout: 15000 })
    .toBe(unfiltered);
  await expect(producerName(page)).toHaveText("Vermut Sabado");
  await expect(page).not.toHaveURL(/[?&]q=/);
});

test("an unfiltered gondola keeps a clean address", async ({ page }) => {
  test.setTimeout(120000);
  await openGondola(page);

  await searchInput(page).fill("queso");
  await expect(page).toHaveURL(/[?&]q=queso/);

  await page.getByTestId("gondola-search-clear").last().click();

  await expect(page).not.toHaveURL(/[?&]q=/);
  await expect(searchInput(page)).toHaveValue("");
});
