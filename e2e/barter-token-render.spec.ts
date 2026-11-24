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

  // The producer name is the semibold datum of the "Productor:" row. It owned
  // the 2px step back when the origin line still lived in the header; that line
  // is gone, so the name now sits on the row baseline with no top margin.
  expect(
    await activeProducerName.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { fontWeight: cs.fontWeight, marginTop: cs.marginTop };
    }),
  ).toEqual({ fontWeight: "600", marginTop: "0px" });

  // The header states which producer you are operating as, not where it is: the
  // origin stays in the selector rows that list every producer.
  await expect(
    page.getByText("📍 Chacra Alimento, Umepay", { exact: true }),
  ).toHaveCount(0);

  // The badge column: the 4px step as a gap.
  expect(
    await page
      .getByTestId("producer-badge-column")
      .evaluate((el) => getComputedStyle(el).gap),
  ).toBe("4px");

  // The identity trigger row owns the 4px gap. Its 2px vertical padding is gone:
  // it stacked with the card's own spacing and doubled the black band between
  // the header and the inbox entry point, so vertical rhythm is the card's job
  // alone. The element asserted is the row itself instead of its first child.
  expect(
    await page.getByTestId("producer-switch-row").evaluate((el) => {
      const cs = getComputedStyle(el);
      return { gap: cs.gap, paddingTop: cs.paddingTop };
    }),
  ).toEqual({ gap: "4px", paddingTop: "0px" });

  // The identity switch is the success variant, whose background is the subdued
  // system green the palette exposes instead of a local literal. It carries its
  // own accessible name: the chip says "Cambiar", and the name states what it
  // changes.
  expect(
    await page
      .getByRole("button", { name: "Cambiar de productor", exact: true })
      .evaluate((el) => getComputedStyle(el).backgroundColor),
  ).toBe("rgba(52, 199, 89, 0.15)");

  await page
    .getByRole("button", {
      name: "Pedir match por Aceite de coco virgen excelente calidad",
      exact: true,
    })
    .click();
  await expect(page.getByRole("radio").first()).toBeVisible();

  // The cart starts empty (issue #162): choosing a package adds it to the
  // offered cart and marks the radio. The styles below read the selected one.
  await page.getByRole("radio").first().click();
  await expect(page.getByRole("radio").first()).toHaveAttribute(
    "aria-checked",
    "true",
  );

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
