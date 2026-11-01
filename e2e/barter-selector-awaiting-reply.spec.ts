import { test, expect } from "@playwright/test";

/**
 * The identity selector answers "who still owes an answer".
 *
 * Switching identity is how an operator picks up a pending proposal, so the
 * producer list has to say who is waiting instead of making them open the inbox
 * and remember. The badge is derived from the same rule the inbox uses for its
 * buttons (`getMatchActionAvailability`), which is what this pins: the target of
 * a pending proposal is flagged, its requester is not.
 */
test("the selector flags the producer that owes an answer", async ({
  page,
}) => {
  test.setTimeout(120000);

  await page.goto("/barter?producerId=sabado");
  await expect(page.getByTestId("active-producer-name")).toHaveText(
    "Vermut Sabado",
    { timeout: 30000 },
  );

  // Vermut Sabado proposes an exact 1 PAP trade for Naturaleza Viva's cheese.
  await page
    .getByRole("button", {
      name: "Pedir match por Horma 2kg Queso Gouda Agroecológico",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Enviar Match" }).click();

  await page.getByTestId("producer-switch-row").getByRole("button").click();

  // The target owes the answer; the requester does not.
  await expect(
    page.getByTestId("producer-awaiting-reply-naturaleza-viva"),
  ).toHaveText("1 por responder");
  await expect(page.getByTestId("producer-awaiting-reply-sabado")).toHaveCount(
    0,
  );

  // A producer with nothing to answer carries no badge at all.
  await page.getByTestId("producer-search-input").fill("chacra monteflore");
  await expect(
    page.getByTestId("producer-option-chacra-monteflore"),
  ).toBeVisible();
  await expect(
    page.getByTestId("producer-awaiting-reply-chacra-monteflore"),
  ).toHaveCount(0);
});
