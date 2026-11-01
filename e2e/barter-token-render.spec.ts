import { test, expect } from "@playwright/test";

/**
 * Pins the value-preserving token pass: the styles that replaced hardcoded
 * literals must still render the pre-change values (fontWeights, spacing.xxs/xs,
 * layout.iconSize.md/xs, radius.full, the subdued system green).
 *
 * Every assertion reads the computed style of the element that owns the style.
 * An earlier version scanned every `div` in the document and asserted with
 * `toContainEqual`, which passes on the strength of any unrelated element that
 * happens to share the value.
 */
test("token-replaced styles render their pre-change values", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.goto("/barter?producerId=sabado");

  const activeProducerName = page.getByTestId("active-producer-name");
  await expect(activeProducerName).toHaveText("Vermut Sabado", {
    timeout: 30000,
  });

  // The producer name carries the heavy weight and the 2px step itself.
  expect(
    await activeProducerName.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { fontWeight: cs.fontWeight, marginTop: cs.marginTop };
    }),
  ).toEqual({ fontWeight: "800", marginTop: "2px" });

  // The location line below it: the 2px step.
  expect(
    await page
      .getByText("📍 Chacra Alimento, Umepay", { exact: true })
      .evaluate((el) => getComputedStyle(el).marginTop),
  ).toBe("2px");

  // The badge column: the 4px step as a gap.
  expect(
    await page
      .getByTestId("producer-badge-column")
      .evaluate((el) => getComputedStyle(el).gap),
  ).toBe("4px");

  // The identity trigger row: it owns the 4px gap and the 2px vertical padding
  // that the chip row's scroll content container used to carry, so the element
  // asserted is the row itself instead of its first child.
  expect(
    await page.getByTestId("producer-switch-row").evaluate((el) => {
      const cs = getComputedStyle(el);
      return { gap: cs.gap, paddingTop: cs.paddingTop };
    }),
  ).toEqual({ gap: "4px", paddingTop: "2px" });

  // The selected producer chip is the success variant, whose background is the
  // subdued system green the palette now exposes instead of a local literal.
  expect(
    await page
      .getByRole("button", { name: "Vermut Sabado", exact: true })
      .evaluate((el) => getComputedStyle(el).backgroundColor),
  ).toBe("rgba(52, 199, 89, 0.15)");

  await page
    .getByRole("button", {
      name: "Pedir match por Horma 2kg Queso Gouda Agroecológico",
      exact: true,
    })
    .click();
  await expect(page.getByRole("radio")).toHaveCount(2);

  // Modal typography, each read from the element that owns the style.
  expect(
    await page
      .getByText("Proponer Trueque (Match)", { exact: true })
      .evaluate((el) => getComputedStyle(el).fontWeight),
  ).toBe("800");
  expect(
    await page
      .getByText(/Pedís un producto a/)
      .evaluate((el) => getComputedStyle(el).marginTop),
  ).toBe("2px");
  expect(
    await page
      .getByText("PRODUCTO QUE QUERÉS:", { exact: true })
      .evaluate((el) => getComputedStyle(el).fontWeight),
  ).toBe("700");

  // The radio circle: the 20px shell and the 10px dot, radii from radius.full.
  const radio = await page
    .getByRole("radio")
    .first()
    .evaluate((el) =>
      Array.from(el.querySelectorAll<HTMLElement>("div")).map((d) => {
        const cs = getComputedStyle(d);
        return {
          fontWeight: cs.fontWeight,
          width: cs.width,
          height: cs.height,
          borderRadius: cs.borderRadius,
        };
      }),
    );
  expect(radio).toContainEqual(expect.objectContaining({ fontWeight: "600" }));

  const shell = radio.find((r) => r.width === "20px");
  const dot = radio.find((r) => r.width === "10px");
  expect(shell, "the 20px radio shell must render").toBeDefined();
  expect(dot, "the 10px radio dot must render").toBeDefined();
  expect(Number.parseFloat(shell!.borderRadius)).toBeGreaterThanOrEqual(10);
  expect(Number.parseFloat(dot!.borderRadius)).toBeGreaterThanOrEqual(5);
});
