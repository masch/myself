import { test, expect } from "@playwright/test";

/** The key the barter store persists its own state under. */
const STORAGE_KEY = "p2p_barter_poc_state_v1";

const now = new Date("2026-10-17T12:00:00.000Z");
const iso = (offsetHours: number) =>
  new Date(now.getTime() + offsetHours * 3600 * 1000).toISOString();

/**
 * A trade only counts as done once both parties confirmed delivery, so the
 * seeded state carries one COMPLETED match and one that is merely accepted —
 * the second one must not show up in the selector.
 */
test("the selector shows how many trades each producer has completed", async ({
  page,
}) => {
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
            targetProducerId: "sabado",
            status: "ACCEPTED",
            deliveryConfirmation: {
              confirmedByRequester: false,
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

  // A producer with no completed trade shows nothing at all.
  await page.getByTestId("producer-search-input").fill("granja nova");
  await expect(page.getByTestId("producer-option-granja-nova")).toBeVisible();
  await expect(
    page.getByTestId("producer-completed-trades-granja-nova"),
  ).toHaveCount(0);
});
