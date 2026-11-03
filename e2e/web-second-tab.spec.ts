import { test, expect } from "@playwright/test";

/**
 * A second tab of the same origin cannot own the local database.
 *
 * On web, expo-sqlite backs its persisted database with OPFS sync access handles,
 * and OPFS allows a single access handle per file per origin: the second tab's
 * open fails with `NoModificationAllowedError` before anything renders. #125 asks
 * for the crash to become an explanation: the tab says the app is already open
 * elsewhere and offers a retry, so closing the first tab makes the second one
 * usable instead of dead.
 *
 * Both pages share one Playwright context, which is what gives them one origin
 * and therefore one OPFS pool.
 */
const IN_USE_SCREEN = "database-in-use-screen";
const HOME_MARKER = "New Task";

test.describe("E2E web second tab", () => {
  test("explains that the app is open elsewhere instead of crashing", async ({
    context,
  }) => {
    test.setTimeout(120000);

    const first = await context.newPage();
    await first.goto("/");
    await expect(first.getByRole("button", { name: HOME_MARKER })).toBeVisible({
      timeout: 30000,
    });

    // The same origin, so the same OPFS pool the first tab is holding.
    const second = await context.newPage();
    await second.goto("/");

    await expect(second.getByTestId(IN_USE_SCREEN)).toBeVisible({
      timeout: 30000,
    });
    // The router error boundary is the failure this replaces.
    await expect(second.getByText("Something went wrong")).toHaveCount(0);
    await expect(second.getByText("NoModificationAllowedError")).toHaveCount(0);

    await first.close();
  });

  test("takes over after the first tab is closed", async ({ context }) => {
    test.setTimeout(120000);

    const first = await context.newPage();
    await first.goto("/");
    await expect(first.getByRole("button", { name: HOME_MARKER })).toBeVisible({
      timeout: 30000,
    });

    const second = await context.newPage();
    await second.goto("/");
    await expect(second.getByTestId(IN_USE_SCREEN)).toBeVisible({
      timeout: 30000,
    });

    // The first tab gives the database back, and retry gets the app running.
    await first.close();
    await second.getByRole("button", { name: "Reintentar" }).click();

    await expect(second.getByRole("button", { name: HOME_MARKER })).toBeVisible(
      { timeout: 60000 },
    );
    await expect(second.getByTestId(IN_USE_SCREEN)).toHaveCount(0);
  });
});
