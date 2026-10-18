import { test, expect } from "@playwright/test";

test.describe("E2E Browser Program Preview Before Enrollment", () => {
  test("browses a program's steps and details from the open-cohort card without enrolling or answering", async ({
    page,
    request,
  }) => {
    test.setTimeout(60000);
    page.on("console", (msg) =>
      console.log(`[Browser Console ${msg.type()}]:`, msg.text()),
    );
    page.on("pageerror", (err) =>
      console.log(`[Browser PageError]:`, err.message),
    );

    // 1. Verify backend API is healthy
    const health = await request.get("http://localhost:8788/health");
    expect(health.ok()).toBe(true);

    // 2. Navigate to reflections tab
    await page.goto("/reflections");
    await expect(page).toHaveTitle(/myself|Reflexiones/i);

    // 3. Switch to "Programas" tab
    const programasTabBtn = page.getByText("Programas").first();
    await expect(programasTabBtn).toBeVisible({ timeout: 10000 });
    await programasTabBtn.click();

    // 4. Locate "Convocatoria Dicotomía del Control" card while not enrolled
    const dichotomyCard = page
      .locator('[data-testid^="cohort-card-convocatoria-dicotom"]')
      .first();
    await expect(dichotomyCard).toBeVisible({ timeout: 10000 });
    await expect(
      dichotomyCard.getByRole("button", {
        name: /Sumarme a la convocatoria/i,
      }),
    ).toBeVisible();
    await expect(page.getByText("Inscripto ✓")).toHaveCount(0);

    // 5. Open the read-only preview from the card
    const previewBtn = dichotomyCard.getByRole("button", {
      name: /Ver qué vas a reflexionar/i,
    });
    await expect(previewBtn).toBeVisible();
    await previewBtn.click();

    const sheet = page.getByRole("dialog").first();
    await expect(sheet).toBeVisible({ timeout: 10000 });

    // 6. The preview lists every step with its prompt and type label
    await expect(sheet.getByText("Paso 1", { exact: true })).toBeVisible({
      timeout: 10000,
    });
    await expect(sheet.getByText("Paso 2", { exact: true })).toBeVisible();
    await expect(sheet.getByText("Texto libre").first()).toBeVisible();
    await expect(
      sheet.getByText(
        /Al final del día, anotá un momento en el que aplicaste esta distinción/,
      ),
    ).toBeVisible();

    // 7. Expand the first step detail and reveal its lesson video and consigna
    await sheet
      .getByRole("button", { name: "Ver el detalle del paso 1" })
      .click();
    await expect(sheet.locator('iframe[src*="6jolZrkdsOw"]')).toBeVisible({
      timeout: 10000,
    });
    await expect(
      sheet.getByText(/La tranquilidad comienza cuando distingues/),
    ).toBeVisible();

    // 8. The preview exposes no answer or skip action
    await expect(sheet.getByRole("button", { name: /Responder/i })).toHaveCount(
      0,
    );
    await expect(sheet.getByRole("button", { name: /Omitir/i })).toHaveCount(0);

    // 9. Still not enrolled: the card keeps offering the enrollment action
    await expect(
      dichotomyCard.getByRole("button", {
        name: /Sumarme a la convocatoria/i,
      }),
    ).toBeVisible();
  });

  test("scrolls through every step on a phone-sized viewport with a step expanded", async ({
    page,
  }) => {
    test.setTimeout(60000);

    // Phone-sized viewport: the sheet content is taller than the screen, so the
    // preview body must scroll instead of clipping the last steps.
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto("/reflections");
    const programasTabBtn = page.getByText("Programas").first();
    await expect(programasTabBtn).toBeVisible({ timeout: 10000 });
    await programasTabBtn.click();

    const dichotomyCard = page
      .locator('[data-testid^="cohort-card-convocatoria-dicotom"]')
      .first();
    await expect(dichotomyCard).toBeVisible({ timeout: 10000 });
    await dichotomyCard
      .getByRole("button", { name: /Ver qué vas a reflexionar/i })
      .click();

    const sheet = page.getByRole("dialog").first();
    await expect(sheet).toBeVisible({ timeout: 10000 });

    // Expand a middle step so the body is longer than the viewport.
    await sheet
      .getByRole("button", { name: "Ver el detalle del paso 2" })
      .click();
    await expect(sheet.getByText("Paso 2", { exact: true })).toBeVisible();

    const body = page.getByTestId("program-preview-scroll").first();
    await expect(body).toBeVisible({ timeout: 10000 });

    // The body must be a real scroll container, not clipped content.
    await expect
      .poll(
        async () =>
          body.evaluate((node) => node.scrollHeight > node.clientHeight + 1),
        {
          timeout: 5000,
        },
      )
      .toBe(true);

    const scrolledTop = await body.evaluate((node) => {
      node.scrollTop = node.scrollHeight;
      return node.scrollTop;
    });
    expect(scrolledTop).toBeGreaterThan(0);

    // The last step must be reachable inside the viewport after scrolling.
    const lastStep = sheet.getByText("Paso 6", { exact: true });
    await expect(lastStep).toBeVisible({ timeout: 5000 });
    const box = await lastStep.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeLessThan(844);
  });
});
