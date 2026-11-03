import { test, expect, type Page } from "@playwright/test";

/**
 * The reflections section and the previewed program live in the address, so
 * "mirá este programa" is a link, and the browser back button closes the preview
 * instead of leaving the section.
 */
const PHONE = { width: 390, height: 800 };
const SHEET = "program-preview-sheet";

const previewButton = (page: Page) =>
  page.getByRole("button", { name: "Ver qué vas a reflexionar" }).first();

async function openPrograms(page: Page) {
  await page.setViewportSize(PHONE);
  await page.goto("/reflections");
  await page.getByText("Programas", { exact: true }).click();
  await expect(previewButton(page)).toBeVisible({ timeout: 30000 });
}

test("opening a program puts it in the address", async ({ page }) => {
  test.setTimeout(120000);
  await openPrograms(page);

  await previewButton(page).click();

  await expect(page.getByTestId(SHEET)).toBeVisible();
  await expect(page).toHaveURL(/[?&]seccion=cohorts/);
  await expect(page).toHaveURL(/[?&]cohorte=[^&]+/);
});

test("the address reproduces the open program on reload", async ({ page }) => {
  test.setTimeout(120000);
  await openPrograms(page);
  await previewButton(page).click();
  await expect(page.getByTestId(SHEET)).toBeVisible();
  const shared = page.url();

  // The programs live in the device's own SQLite database, so the address is what
  // reproduces the view: a reload is a cold start with nothing but the URL.
  // Opening it in a second tab is not an option — the web storage layer allows one
  // tab per origin and the second one fails to open the database at all.
  await page.goto(shared);

  await expect(page.getByTestId(SHEET)).toBeVisible({ timeout: 30000 });
  await expect(page).toHaveURL(/[?&]cohorte=[^&]+/);
});

test("a device that does not know the program opens the section without a sheet", async ({
  browser,
}) => {
  test.setTimeout(120000);
  // A fresh context starts with its own empty database, which is what a different
  // person without that program has.
  const other = await browser.newContext();

  try {
    const otherPage = await other.newPage();
    await otherPage.setViewportSize(PHONE);
    await otherPage.goto("/reflections?seccion=cohorts&cohorte=some-program");

    await expect(otherPage.getByText("Programas", { exact: true })).toBeVisible(
      {
        timeout: 30000,
      },
    );
    await expect(otherPage.getByTestId(SHEET)).toHaveCount(0);
  } finally {
    await other.close();
  }
});

test("back closes the preview and keeps the section", async ({ page }) => {
  test.setTimeout(120000);
  await openPrograms(page);
  await previewButton(page).click();
  await expect(page.getByTestId(SHEET)).toBeVisible();

  await page.goBack();

  await expect(page.getByTestId(SHEET)).toHaveCount(0);
  await expect(page.getByText("Programas", { exact: true })).toBeVisible();
  await expect(page).not.toHaveURL(/[?&]cohorte=/);
});

test("an unknown program opens the section without a sheet", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.setViewportSize(PHONE);
  await page.goto("/reflections?seccion=cohorts&cohorte=does-not-exist");

  await expect(page.getByText("Programas", { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByTestId(SHEET)).toHaveCount(0);
});
