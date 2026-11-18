import { test, expect } from "@playwright/test";

/**
 * The offered side of the proposal modal is a cart (issue #162): each package
 * is an independently toggleable option, and choosing one does not uncheck the
 * others. Every checked radio is a cart line; unchecking removes the line.
 *
 * The list is narrowed with the modal's own search so every radio fits in the
 * scroll viewport: the assertions read real toggles, not scroll acrobatics.
 */
test("the proposal radios toggle cart lines independently", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.goto("/barter?producerId=naturaleza-viva");
  await expect(page.getByTestId("active-producer-name")).toHaveText(
    "Naturaleza Viva",
    { timeout: 30000 },
  );

  // The vermut is the 890th printed package, so the virtualized gondola only
  // renders it once the search narrows the list.
  await page.getByTestId("gondola-search-input").fill("vermut rosso");

  await page
    .getByRole("button", {
      name: "Pedir match por Vermut Rosso (muy bueno)",
      exact: true,
    })
    .click();
  // The modal carries two radio sections (issue #162); this test drives the
  // offer side. Narrow the own inventory to a handful of rows so every radio
  // is in the sheet's scroll viewport.
  await page.getByTestId("own-package-search").fill("aceite");
  const radios = page.getByTestId("own-package-list").getByRole("radio");
  await expect(radios).toHaveCount(3);

  const checked = page.getByRole("radio", { checked: true });
  const first = radios.nth(0);
  const second = radios.nth(1);

  // The cart starts empty: nothing is checked yet.
  await expect(checked).toHaveCount(0);

  // Choosing a package adds it to the cart: the radio checks.
  await second.click();
  await expect(checked).toHaveCount(1);
  expect(await checked.getAttribute("aria-label")).toBe(
    await second.getAttribute("aria-label"),
  );

  // The cart is multi-select: a second package checks without unchecking the
  // first — two lines, two PAP offered.
  await first.click();
  await expect(checked).toHaveCount(2);

  // Unchecking removes the line: back to one line, still the second package.
  await first.click();
  await expect(checked).toHaveCount(1);
  expect(await checked.getAttribute("aria-label")).toBe(
    await second.getAttribute("aria-label"),
  );
});
