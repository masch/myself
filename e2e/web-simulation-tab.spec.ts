import { test, expect } from "@playwright/test";

/**
 * A barter simulation tab has no local database, and says so instead of crashing.
 *
 * A tab opened with `?producerId=` (or `?producer=`) is remembered as a producer
 * simulation: it renders the app shell without the SQLite providers, because
 * OPFS gives the database file to one tab of the origin at a time and the POC
 * needs two tabs of one origin. The isolation is by design; the crash was not.
 * Navigating that tab to any database-backed screen threw `useSQLiteContext must
 * be used within a <SQLiteProvider>` into the router error boundary, so the tab
 * explained nothing and offered no way out. These specs pin the explanation, the
 * way back to the gondola, and that a normal tab keeps its full app.
 */
const PHONE = { width: 360, height: 740 };
const NOTICE = "simulation-tab-notice";
const HOME_MARKER = "New Task";
const BACK_TO_GONDOLA = "Volver a la góndola";

test.describe("E2E web simulation tab", () => {
  test("explains the missing database instead of crashing on a later navigation", async ({
    page,
  }) => {
    test.setTimeout(120000);

    await page.setViewportSize(PHONE);
    await page.goto("/barter?producerId=sabado");
    await expect(page.getByTestId("active-producer-name")).toHaveText(
      "Vermut Sabado",
      { timeout: 30000 },
    );

    // Same tab, so the flag the parameter set in `sessionStorage` survives this
    // load: the home tab asks for the database the simulation tab cannot own.
    await page.goto("/");

    await expect(page.getByTestId(NOTICE)).toBeVisible({ timeout: 30000 });
    // The router error boundary is the failure this replaces.
    await expect(page.getByText("Something went wrong")).toHaveCount(0);
    await expect(
      page.getByText("must be used within a <SQLiteProvider>"),
    ).toHaveCount(0);

    // The explanation is not a dead end: it carries the way back to the gondola.
    await page.getByRole("button", { name: BACK_TO_GONDOLA }).click();
    await expect(page.getByTestId("active-producer-name")).toHaveText(
      "Vermut Sabado",
      { timeout: 30000 },
    );
    await expect(page.getByTestId(NOTICE)).toHaveCount(0);
  });

  test("leaves a normal tab on the home screen", async ({ page }) => {
    test.setTimeout(120000);

    // This page never carried a producer parameter, so it is not a simulation
    // tab and must keep the full app, database included.
    await page.setViewportSize(PHONE);
    await page.goto("/");

    await expect(page.getByRole("button", { name: HOME_MARKER })).toBeVisible({
      timeout: 30000,
    });
    await expect(page.getByTestId(NOTICE)).toHaveCount(0);
  });
});
