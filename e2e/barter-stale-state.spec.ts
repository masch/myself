import { test, expect } from "@playwright/test";

/** The key the barter store persists its own state under. */
const STORAGE_KEY = "p2p_barter_poc_state_v1";

/**
 * A persisted state written by a previous build.
 *
 * Renaming a producer id is enough to orphan the packages already stored in
 * `localStorage`, and a tab still running the old build also broadcasts its own
 * packages to its peers. The gondola resolved each package's producer with a
 * non-null assertion, so a single orphan crashed the whole screen on
 * `producer.latitude` instead of rendering without it.
 */
test.describe("E2E barter with a state written by a previous build", () => {
  test("renders when a stored package names a producer that no longer exists", async ({
    page,
  }) => {
    test.setTimeout(120000);

    await page.addInitScript(
      ([key, state]: [string, string]) => {
        window.localStorage.setItem(key, state);
      },
      [
        STORAGE_KEY,
        JSON.stringify({
          packages: [
            {
              id: "pkg-from-old-build",
              producerId: "prod-renamed",
              title: "Pack de un build anterior",
              productionType: "ORGANIC",
              priceArs: 50000,
              papValue: 1,
              stockUnits: 3,
            },
          ],
          matches: [],
          papConfigArs: 50000,
        }),
      ],
    );

    await page.goto("/barter?producerId=sabado");

    // The screen boots and the orphan stays hidden, instead of throwing.
    await expect(page.getByTestId("active-producer-name")).toHaveText(
      "Vermut Sabado",
      { timeout: 30000 },
    );
    await expect(page.getByText("Góndola de Productores")).toBeVisible();
    await expect(page.getByText("Pack de un build anterior")).toHaveCount(0);
    await expect(page.getByText("Something went wrong")).toHaveCount(0);
  });

  test("shows a package stored under a renamed producer id", async ({
    page,
  }) => {
    test.setTimeout(120000);

    // The previous build stored the package under `prod-vermut` and handed out
    // links naming `prod-queso`.
    await page.addInitScript(
      ([key, state]: [string, string]) => {
        window.localStorage.setItem(key, state);
      },
      [
        STORAGE_KEY,
        JSON.stringify({
          packages: [
            {
              id: "pkg-before-rename",
              producerId: "prod-vermut",
              title: "Pack previo al renombre de productores",
              productionType: "AGROECOLOGICAL",
              priceArs: 50000,
              papValue: 1,
              stockUnits: 3,
            },
          ],
          matches: [],
          papConfigArs: 50000,
        }),
      ],
    );

    await page.goto("/barter?producerId=prod-queso");

    // The former id resolves, so a link already handed out keeps working.
    await expect(page.getByTestId("active-producer-name")).toHaveText(
      "Naturaleza Viva",
      { timeout: 30000 },
    );

    // The stored package is migrated instead of orphaned: it reaches the
    // gondola of the other producer, which only the rewrite makes possible.
    await expect(page.getByText("Góndola de Productores")).toBeVisible();
    await expect(
      page.getByText("Pack previo al renombre de productores"),
    ).toBeVisible();
    await expect(page.getByText("Something went wrong")).toHaveCount(0);
  });
});
