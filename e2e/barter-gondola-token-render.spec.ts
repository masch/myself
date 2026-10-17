import { test, expect } from "@playwright/test";

/**
 * Pins the value-preserving token pass for the filter bar: `marginBottom: 4`
 * and `paddingBottom: 2` became `spacing.xs` and `spacing.xxs`. Each value is
 * read from the element that owns the style — the section title and the chip
 * row's content container — instead of scanning the document for any element
 * that happens to carry it.
 */
test("the gondola filter bar renders the token-swapped spacing values", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.goto("/barter?producerId=sabado");
  await expect(page.getByTestId("active-producer-name")).toHaveText(
    "Vermut Sabado",
    { timeout: 30000 },
  );

  // spacing.xs, on the section title itself.
  expect(
    await page
      .getByText("Filtrar por certificación:", { exact: true })
      .evaluate((el) => getComputedStyle(el).marginBottom),
  ).toBe("4px");

  // spacing.xxs and spacing.xs on the chip row's content container.
  expect(
    await page.getByTestId("gondola-filter-row").evaluate((el) => {
      const inner = el.firstElementChild as HTMLElement;
      const cs = getComputedStyle(inner);
      return { paddingBottom: cs.paddingBottom, gap: cs.gap };
    }),
  ).toEqual({ paddingBottom: "2px", gap: "4px" });
});
