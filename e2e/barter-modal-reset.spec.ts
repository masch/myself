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
 * The modal's offers are ARIA radios, but react-native-web 0.21 dropped the
 * `accessibilityState` mapping: the radios carry no `aria-checked`, so the
 * accessibility tree cannot report which one is selected. The checked state is
 * therefore asserted through the consequence the bug report names: `canSubmit`
 * enables "Enviar Match" exactly when the preselected id matches one of the
 * listed packages.
 */
test.describe("E2E barter proposal modal reset on producer switch", () => {
  test("preselects one package again after switching producer in-app", async ({
    page,
  }) => {
    test.setTimeout(120000);

    await page.goto("/barter?producerId=sabado");
    await expect(page.getByTestId("active-producer-name")).toHaveText(
      "Vermut Sabado",
      { timeout: 30000 },
    );

    const proposalRadios = page.getByRole("radio");
    const submitProposal = page.getByRole("button", { name: "Enviar Match" });

    // First open, as Vermut Sabado, for a package owned by Naturaleza Viva:
    // the modal lists this producer's two packages with one preselected.
    await page
      .getByRole("button", {
        name: "Pedir match por Horma 2kg Queso Gouda Agroecológico",
        exact: true,
      })
      .click();
    await expect(proposalRadios).toHaveCount(2);
    await expect(submitProposal).toBeEnabled();

    await page.getByRole("button", { name: "Cancelar" }).click();
    await expect(proposalRadios).toHaveCount(0);

    // The operator becomes Naturaleza Viva from the header switcher, without
    // reloading: a reload rebuilds the screen and hides the stale selection.
    await page
      .getByRole("button", { name: "Naturaleza Viva", exact: true })
      .click();
    await expect(page.getByTestId("active-producer-name")).toHaveText(
      "Naturaleza Viva",
    );

    // Second open, now for a package of a third producer: the offers are the
    // new producer's two packages, and the first one is preselected again.
    await page
      .getByRole("button", {
        name: "Pedir match por Caja 3 Frascos Polen & Jalea Real",
        exact: true,
      })
      .click();
    await expect(proposalRadios).toHaveCount(2);
    await expect(submitProposal).toBeEnabled();
  });
});
