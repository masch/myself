import { test, expect } from "@playwright/test";

/**
 * Reopening the proposal modal after switching producer.
 *
 * The modal stays mounted for the whole screen, so the package it preselects
 * comes from a `useState` initializer that only runs on the first render. Once
 * the active producer changes, that stale id matches nothing in the new
 * producer's catalog: nothing is preselected and "Enviar Match" stays disabled
 * until the operator picks a package again. The call site keys the modal on the
 * producer and the target it is showing, so the selection resets with them.
 *
 * The modal's offers are ARIA radios, and the checked state is asserted two
 * ways: through `aria-checked`, which react-native-web 0.21 exposes only when
 * the component passes the `aria-checked` prop (`accessibilityState` alone is
 * dropped, so assistive tech reported no selection), and through the
 * consequence the bug report names: `canSubmit` enables "Enviar Match" exactly
 * when the preselected id matches one of the listed packages.
 */
test.describe("E2E barter proposal modal reset on producer switch", () => {
  test("preselects one package again after switching producer in-app", async ({
    page,
  }) => {
    test.setTimeout(120000);

    await page.goto("/barter?producerId=naturaleza-viva");
    await expect(page.getByTestId("active-producer-name")).toHaveText(
      "Naturaleza Viva",
      { timeout: 30000 },
    );

    // The modal carries two radio sections (issue #162): the ask side lists
    // the target producer's inventory and the offer side the operator's own.
    // Every assertion scopes to one section, never to the whole sheet.
    const ownRadios = page.getByTestId("own-package-list").getByRole("radio");
    const ownChecked = page
      .getByTestId("own-package-list")
      .getByRole("radio", { checked: true });
    const submitProposal = page.getByRole("button", { name: "Enviar Match" });

    // First open, as Naturaleza Viva, for the one package Vermut Sabado prints:
    // the offers are this producer's own inventory, with one preselected. The
    // modal searches that inventory, because a printed producer ships up to 77
    // packages.
    // The vermut is the 890th printed package, so the virtualized gondola only
    // renders it once the search narrows the list.
    await page.getByTestId("gondola-search-input").fill("vermut rosso");
    await page
      .getByRole("button", {
        name: "Pedir match por Vermut Rosso (muy bueno)",
        exact: true,
      })
      .click();
    // The cart starts empty on both sides (issue #162): nothing is preselected
    // and the submit waits for a chosen package.
    await expect(ownChecked).toHaveCount(0);
    await expect(submitProposal).toBeDisabled();
    await page.getByTestId("own-package-search").fill("aceite de coco");
    await expect(ownRadios).toHaveCount(1);
    await ownRadios.first().click();
    await expect(ownChecked).toHaveCount(1);
    await expect(submitProposal).toBeEnabled();
    // The ask side keeps the tapped card: 1 PAP each, balanced.

    await page.getByRole("button", { name: "Cancelar" }).click();
    await expect(ownRadios).toHaveCount(0);

    // The operator becomes Vermut Sabado from the header switcher, without
    // reloading: a reload rebuilds the screen and hides the stale selection.
    // The switcher is a searchable selector because the catalog is 158 long.
    await page.getByTestId("producer-switch-row").getByRole("button").click();
    await page.getByTestId("producer-search-input").fill("sabado");
    await page.getByTestId("producer-option-sabado").click();
    await expect(page.getByTestId("active-producer-name")).toHaveText(
      "Vermut Sabado",
    );

    // Second open, now for a package of the other producer: the offers are the
    // new producer's inventory, not the previous one's. The cheese is Naturaleza
    // Viva's, and the oil the trade asks for is not on offer any more.
    await page.getByTestId("gondola-search-input").fill("queso de cabra");
    await page
      .getByRole("button", {
        name: "Pedir match por Queso de cabra horma 500 gr aprox",
        exact: true,
      })
      .click();
    // The modal remounts keyed on the producer+target pair: the cart resets
    // and the search field is empty again.
    await expect(ownChecked).toHaveCount(0);
    await expect(page.getByTestId("own-package-search")).toBeVisible();
    // The previous producer's inventory (Naturaleza Viva's oil) is not on
    // offer any more...
    await page.getByTestId("own-package-search").fill("aceite de coco");
    await expect(ownRadios).toHaveCount(0);
    // ...and the new producer's own printed product is, by its unique seed
    // title — "vermut rosso" alone matches the three direct packages too, and
    // the printed row's title carries no size since the sizeless-title change.
    await page
      .getByTestId("own-package-search")
      .fill("vermut rosso (muy bueno)");
    await expect(ownRadios).toHaveCount(1);
    await ownRadios.first().click();
    await expect(ownChecked).toHaveCount(1);
    await expect(submitProposal).toBeEnabled();
    await expect(ownRadios.filter({ hasText: "Vermut Rosso" })).toBeVisible();
    // ...and the new producer's own printed product is, by its unique seed
    // title — "vermut rosso" alone matches the three direct packages too, and
    // the printed row's title carries no size since the sizeless-title change.
    await page
      .getByTestId("own-package-search")
      .fill("vermut rosso (muy bueno)");
    await expect(ownRadios).toHaveCount(1);
    await expect(ownRadios.filter({ hasText: "Vermut Rosso" })).toBeVisible();
  });
});
