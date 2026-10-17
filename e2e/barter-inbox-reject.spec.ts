import { test, expect } from "@playwright/test";

/**
 * The inbox reject path, end to end: the button reaches the store with the
 * active producer and the rejected match is persisted.
 *
 * The store's reject guard (issue #83, item 1) made this the first E2E that
 * clicks `Rechazar` at all — before it, no committed spec exercised the
 * action, so a green run could not tell whether the button still worked.
 */

const STORAGE_KEY = "p2p_barter_poc_state_v1";

const SEEDED_STATE = {
  packages: [
    {
      id: "pkg-vermut-pack4",
      producerId: "sabado",
      title: "Pack 4 Botellas Vermut Rosso 750ml",
      productionType: "AGROECOLOGICAL",
      priceArs: 50000,
      papValue: 1,
      stockUnits: 5,
    },
    {
      id: "pkg-queso-gouda",
      producerId: "naturaleza-viva",
      title: "Horma 2kg Queso Gouda Agroecológico",
      productionType: "ORGANIC",
      priceArs: 50000,
      papValue: 1,
      stockUnits: 4,
    },
  ],
  matches: [
    {
      id: "match-reject-ui",
      requesterId: "sabado",
      targetProducerId: "naturaleza-viva",
      offeredPackageId: "pkg-vermut-pack4",
      targetPackageId: "pkg-queso-gouda",
      papSnapshotArs: 50000,
      totalPap: 1,
      status: "PENDING",
      deliveryConfirmation: {
        confirmedByRequester: false,
        confirmedByTarget: false,
      },
      expiresAt: "2030-01-01T00:00:00.000Z",
      createdAt: "2026-10-16T12:00:00.000Z",
      updatedAt: "2026-10-16T12:00:00.000Z",
    },
  ],
  papConfigArs: 50000,
};

test.describe("Barter inbox: rejecting a received proposal", () => {
  test("the target producer rejects the pending proposal it received", async ({
    page,
  }) => {
    test.setTimeout(120000);

    await page.addInitScript(
      ([key, state]: [string, string]) => {
        window.localStorage.setItem(key, state);
      },
      [STORAGE_KEY, JSON.stringify(SEEDED_STATE)],
    );

    await page.goto("/barter-inbox?producerId=naturaleza-viva");
    await expect(page.getByTestId("active-producer-name")).toHaveText(
      "Naturaleza Viva",
      { timeout: 30000 },
    );

    const reject = page.getByRole("button", { name: "Rechazar" });
    await expect(reject).toHaveCount(1);

    await reject.click();

    await expect(page.getByRole("alert")).toContainText("Propuesta rechazada.");

    const persisted = await page.evaluate(
      (key) => window.localStorage.getItem(key),
      STORAGE_KEY,
    );
    const parsed = JSON.parse(persisted ?? "{}");
    expect(parsed.matches?.[0]?.status).toBe("REJECTED");

    // The rejected match offers no action any more.
    await expect(page.getByRole("button", { name: "Rechazar" })).toHaveCount(0);
  });
});
