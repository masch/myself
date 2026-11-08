import { test, expect } from "@playwright/test";

/**
 * The checked radio must follow the selection, not only exist.
 *
 * The reset spec asserts the count of checked radios after each open; this one
 * pins which offer is checked and that picking another one moves the checked
 * state, plus the raw `aria-checked` pair on the two offers.
 *
 * Found by the independent verification of the token/a11y sweep as its
 * accessibility probe.
 */
test("the checked proposal radio follows the selection", async ({ page }) => {
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
      name: "Pedir match por Vermut Rosso x 750 ml (muy bueno)",
      exact: true,
    })
    .click();
  // A printed producer ships up to 77 packages, so the count is not the point:
  // what matters is that the list offers more than one and exactly one is
  // checked. The modal's own search is how an operator reaches one of the 77.
  await expect(page.getByRole("radio").first()).toBeVisible();
  expect(await page.getByRole("radio").count()).toBeGreaterThan(1);

  const checked = page.getByRole("radio", { checked: true });
  const first = page.getByRole("radio").nth(0);
  const second = page.getByRole("radio").nth(1);

  await expect(checked).toHaveCount(1);
  expect(await checked.getAttribute("aria-label")).toBe(
    await first.getAttribute("aria-label"),
  );

  await second.click();
  await expect(checked).toHaveCount(1);
  expect(await checked.getAttribute("aria-label")).toBe(
    await second.getAttribute("aria-label"),
  );

  await first.click();
  await expect(checked).toHaveCount(1);
  expect(await checked.getAttribute("aria-label")).toBe(
    await first.getAttribute("aria-label"),
  );

  const raw = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[role="radio"]')).map((el) => ({
      ariaChecked: el.getAttribute("aria-checked"),
    })),
  );
  expect(raw.filter((r) => r.ariaChecked === "true")).toHaveLength(1);
  expect(raw.filter((r) => r.ariaChecked === "false")).toHaveLength(
    raw.length - 1,
  );
});
