import { test, expect } from "@playwright/test";

test.describe("E2E Browser Cohort Video & Preparatory Content Flow", () => {
  test("enrolls in new Stoic Dichotomy program, plays in-app video, reviews preparatory exercises, and answers step 1", async ({
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

    // 4. Locate "Convocatoria Dicotomía del Control" card
    const dichotomyCard = page
      .locator('[data-testid^="cohort-card-convocatoria-dicotom"]')
      .first();
    await expect(dichotomyCard).toBeVisible({ timeout: 10000 });
    await expect(
      dichotomyCard.getByText("Dicotomía del Control Estoico"),
    ).toBeVisible();

    // 5. Enroll in the cohort
    const enrollBtn = dichotomyCard.getByRole("button", {
      name: /Sumarme a la convocatoria/i,
    });
    await expect(enrollBtn).toBeVisible();
    await enrollBtn.click();

    // 6. Verify active cohort card is rendered with multimedia step content
    // 6a. Check embedded YouTube player and iframe exist with the target video ID
    const youtubePlayer = page.getByTestId("cohort-video-step-1");
    await expect(youtubePlayer).toBeVisible({ timeout: 10000 });
    const youtubeIframe = youtubePlayer.locator('iframe[src*="6jolZrkdsOw"]');
    await expect(youtubeIframe).toBeVisible({ timeout: 10000 });

    // 6b. Check preparatory blockquote
    await expect(
      page.getByText(
        /La tranquilidad comienza cuando distingues lo que depende de ti/i,
      ),
    ).toBeVisible();

    // 6c. Check preparatory exercise heading and bullets
    await expect(
      page.getByText("Ejercicio Práctico", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText(/¿Esto depende de mí o no\?/i)).toBeVisible();
    await expect(page.getByText(/Elijo la calma/i)).toBeVisible();

    // 6d. Check prompt card for Day 1
    const promptText = page.getByText(
      /Al final del día, anotá un momento en el que aplicaste esta distinción/i,
    );
    await expect(promptText).toBeVisible();

    // 7. Answer the question in the reflection modal
    const answerBtn = page.getByRole("button", { name: "Responder" }).first();
    await expect(answerBtn).toBeVisible();
    await answerBtn.click();

    // Modal should show the preparatory section as well
    const modal = page
      .locator('[role="dialog"]')
      .or(page.locator(".modal-content"))
      .first();
    await expect(page.getByText(/Consigna del día/i).first()).toBeVisible({
      timeout: 5000,
    });

    // Fill response
    const inputField = page.getByPlaceholder(
      "Escribí tu respuesta con honestidad...",
    );
    await expect(inputField).toBeVisible({ timeout: 5000 });
    await inputField.fill(
      "Hoy en el trabajo surgió un imprevisto; respiré, me pregunté si dependía de mí y me enfoqué solo en lo que podía resolver.",
    );

    // Submit response
    const submitBtn = page
      .getByRole("button", {
        name: /^Guardar$/i,
      })
      .first();
    await expect(submitBtn).toBeVisible({ timeout: 5000 });
    await submitBtn.click();

    // 8. Confirm progress updated to completed
    await expect(
      page.getByText(/Completado|Ciclo finalizado|Pasos completados/i).first(),
    ).toBeVisible({ timeout: 10000 });
  });
});
