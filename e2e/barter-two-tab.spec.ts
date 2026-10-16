import { test, expect } from "@playwright/test";

/**
 * Two producer tabs of the same origin.
 *
 * The barter POC simulates two producers with two browser tabs, because its
 * state syncs through a `BroadcastChannel` and a channel only reaches tabs of
 * one origin. Two tabs of one origin must therefore both be able to boot: the
 * root SQLite provider cannot reserve the persisted OPFS database for a single
 * tab, which used to kill the second one with `NoModificationAllowedError` from
 * the `<SQLiteProvider>` in the root layout.
 */
test.describe("E2E barter two-tab producer simulation", () => {
  test("boots a counterpart producer tab on the same origin", async ({
    context,
  }) => {
    test.setTimeout(120000);

    // Tab A operates as Vermut Sabado, selected by producer id
    const vermut = await context.newPage();
    await vermut.goto("/barter?producerId=sabado");
    await expect(vermut.getByTestId("active-producer-name")).toHaveText(
      "Vermut Sabado",
      { timeout: 30000 },
    );

    // Tab B is the counterpart on the very same origin, so it shares the
    // BroadcastChannel the simulation needs. Same origin also means it would
    // fight over the persisted OPFS database if the simulation tab were not
    // without database providers. It selects its producer by display name, so
    // this also pins that `?producerId=` accepts a name and not only an id.
    const queso = await context.newPage();
    await queso.goto("/barter?producerId=Naturaleza%20Viva");
    await expect(queso.getByTestId("active-producer-name")).toHaveText(
      "Naturaleza Viva",
      { timeout: 30000 },
    );

    // Both tabs render the gondola instead of the router error boundary
    await expect(vermut.getByText("Góndola de Productores")).toBeVisible();
    await expect(queso.getByText("Góndola de Productores")).toBeVisible();
    await expect(queso.getByText("Something went wrong")).toHaveCount(0);
  });
});
