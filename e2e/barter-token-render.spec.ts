import { test, expect } from "@playwright/test";

/**
 * Pins the value-preserving token pass: the styles that replaced hardcoded
 * literals must still render the pre-change values (fontWeights, spacing.xxs/xs,
 * layout.iconSize.md/xs, radius.full).
 */
test("token-replaced styles render their pre-change values", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.goto("/barter?producerId=sabado");
  await expect(page.getByTestId("active-producer-name")).toHaveText(
    "Vermut Sabado",
    { timeout: 30000 },
  );

  expect(
    await page.getByTestId("active-producer-name").evaluate((el) => {
      const cs = getComputedStyle(el);
      return { fontWeight: cs.fontWeight, marginTop: cs.marginTop };
    }),
  ).toEqual({ fontWeight: "800", marginTop: "2px" });

  const header = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>("div")).map((el) => {
      const cs = getComputedStyle(el);
      return {
        gap: cs.gap,
        paddingTop: cs.paddingTop,
        marginTop: cs.marginTop,
      };
    }),
  );
  expect(header).toContainEqual(
    expect.objectContaining({ gap: "2px", marginTop: "0px" }),
  );
  expect(header).toContainEqual(expect.objectContaining({ paddingTop: "2px" }));
  expect(header).toContainEqual(expect.objectContaining({ marginTop: "4px" }));

  await page
    .getByRole("button", {
      name: "Pedir match por Horma 2kg Queso Gouda Agroecológico",
      exact: true,
    })
    .click();
  await expect(page.getByRole("radio")).toHaveCount(2);

  const all = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>("div,span,p")).map(
      (el) => {
        const cs = getComputedStyle(el);
        return {
          text: (el.textContent ?? "").slice(0, 60),
          fontWeight: cs.fontWeight,
          marginTop: cs.marginTop,
        };
      },
    ),
  );
  expect(all).toContainEqual(
    expect.objectContaining({
      text: "Proponer Trueque (Match)",
      fontWeight: "800",
    }),
  );
  expect(all).toContainEqual(
    expect.objectContaining({
      text: expect.stringContaining("Pedís un producto a"),
      marginTop: "2px",
    }),
  );
  expect(all).toContainEqual(
    expect.objectContaining({
      text: "PRODUCTO QUE QUERÉS:",
      fontWeight: "700",
    }),
  );
  expect(all).toContainEqual(
    expect.objectContaining({
      text: "Horma 2kg Queso Gouda Agroecológico",
      marginTop: "2px",
    }),
  );

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
          borderWidth: cs.borderWidth,
        };
      }),
    );
  expect(radio).toContainEqual(expect.objectContaining({ fontWeight: "600" }));
  const shell = radio.find((r) => r.width === "20px");
  const dot = radio.find((r) => r.width === "10px");
  expect(shell).toBeDefined();
  expect(dot).toBeDefined();
  expect(Number.parseFloat(shell!.borderRadius)).toBeGreaterThanOrEqual(10);
  expect(Number.parseFloat(dot!.borderRadius)).toBeGreaterThanOrEqual(5);
});
