import { test, expect } from "@playwright/test";

/** The key the barter store persists its own state under. */
const STORAGE_KEY = "p2p_barter_poc_state_v1";

const now = new Date("2026-10-17T12:00:00.000Z");
const iso = (offsetHours: number) =>
  new Date(now.getTime() + offsetHours * 3600 * 1000).toISOString();

/**
 * Each row says what that producer still has on its plate, stage by stage: an
 * answer owed, a delivery to coordinate, a receipt to confirm, and the trades
 * that actually happened. A trade only counts as done once both parties
 * confirmed delivery, so a merely accepted one must not become a completed one.
 */
test("the selector shows each producer's trade chips", async ({ page }) => {
  test.setTimeout(120000);

  const baseMatch = {
    offeredPackageId: "pkg-vermut-pack4",
    targetPackageId: "pkg-queso-gouda",
    papSnapshotArs: 50000,
    totalPap: 1,
    deliveryConfirmation: {
      confirmedByRequester: true,
      confirmedByTarget: true,
    },
    createdAt: iso(0),
    updatedAt: iso(1),
    expiresAt: iso(48),
  };

  await page.addInitScript(
    ([key, state]: [string, string]) => {
      window.localStorage.setItem(key, state);
    },
    [
      STORAGE_KEY,
      JSON.stringify({
        packages: [],
        matches: [
          {
            ...baseMatch,
            id: "match-completed-1",
            requesterId: "sabado",
            targetProducerId: "naturaleza-viva",
            status: "COMPLETED",
          },
          {
            ...baseMatch,
            id: "match-completed-2",
            requesterId: "naturaleza-viva",
            targetProducerId: "sabado",
            status: "COMPLETED",
          },
          {
            ...baseMatch,
            id: "match-only-accepted",
            requesterId: "naturaleza-viva",
            targetProducerId: "granja-nova",
            status: "ACCEPTED",
            deliveryConfirmation: {
              confirmedByRequester: false,
              confirmedByTarget: false,
            },
          },
          {
            ...baseMatch,
            id: "match-waiting-on-target",
            requesterId: "granja-nova",
            targetProducerId: "campo-claro",
            status: "WAITING_DELIVERY",
            deliveryConfirmation: {
              confirmedByRequester: true,
              confirmedByTarget: false,
            },
          },
        ],
        papConfigArs: 50000,
      }),
    ],
  );

  await page.goto("/barter?producerId=sabado");
  await expect(page.getByTestId("active-producer-name")).toHaveText(
    "Vermut Sabado",
    { timeout: 30000 },
  );

  await page.getByTestId("producer-switch-row").getByRole("button").click();

  // Two delivered and confirmed trades, counted for both parties; the accepted
  // one that never got delivered does not add to the number. The list is
  // virtualized over 158 producers, so each row is reached by searching.
  await expect(
    page.getByTestId("producer-completed-trades-naturaleza-viva"),
  ).toHaveText("2 trueques");

  await page.getByTestId("producer-search-input").fill("vermut");
  await expect(page.getByTestId("producer-completed-trades-sabado")).toHaveText(
    "2 trueques",
  );

  // The stages in between are chips of their own: an agreed trade is not a
  // completed one, and a delivery waiting on this producer is its own to-do.
  await page.getByTestId("producer-search-input").fill("granja nova");
  await expect(
    page.getByTestId("producer-to-coordinate-granja-nova"),
  ).toHaveText("1 por coordinar entrega");
  await expect(
    page.getByTestId("producer-completed-trades-granja-nova"),
  ).toHaveCount(0);

  await page.getByTestId("producer-search-input").fill("campo claro");
  await expect(page.getByTestId("producer-to-confirm-campo-claro")).toHaveText(
    "1 por confirmar llegada",
  );

  // The filter narrows the list to the producers that actually have something
  // to do: the seeded state leaves `sabado` with two finished trades and
  // nothing pending, and a producer with history only must drop out.
  // The filter composes with the search, so the query from the step above has
  // to be cleared before it can be read on its own.
  await page.getByTestId("producer-search-input").fill("");
  await page.getByTestId("producer-filter-actions").click();
  await expect(page.getByTestId("producer-filter-actions")).toHaveText(
    "Con acciones (3)",
  );
  await expect(
    page.getByTestId("producer-to-coordinate-granja-nova"),
  ).toBeVisible();

  // Same query, only the filter differs: a producer whose trades are all
  // finished has nothing to do, so it drops out while the filter is on.
  await page.getByTestId("producer-search-input").fill("vermut");
  await expect(page.getByTestId("producer-option-sabado")).toHaveCount(0);
  await page.getByTestId("producer-filter-actions").click();
  await expect(page.getByTestId("producer-option-sabado")).toBeVisible();

  await page.getByTestId("producer-search-input").fill("");

  // A producer with no completed trade shows nothing at all.
  await page.getByTestId("producer-search-input").fill("granja nova");
  await expect(page.getByTestId("producer-option-granja-nova")).toBeVisible();
  await expect(
    page.getByTestId("producer-completed-trades-granja-nova"),
  ).toHaveCount(0);
});
