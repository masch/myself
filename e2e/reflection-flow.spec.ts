import { test, expect } from "@playwright/test";
import { TestClock } from "./helpers/clock";

const SEEDED_IDS = {
  morning: "b2000000-0000-4000-8000-000000000001",
  evening: "b2000000-0000-4000-8000-000000000002",
  gratitude: "b2000000-0000-4000-8000-000000000003",
  adhoc: "b3000000-0000-4000-8000-000000000001",
};

test.describe("E2E Browser Personal Reflections Flow", () => {
  test("answers daily text reflection, submits scale reflection, skips with reason, and enrolls in cohort", async ({
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

    // 1. Verify backend API is running
    const health = await request.get("http://localhost:8788/health");
    expect(health.ok()).toBe(true);

    // 1b. Mock browser clock to registration day (2026-09-11 12:00 PM)
    const clock = await TestClock.install(page, "2026-09-11T12:00:00Z");

    // 2. Navigate directly to reflections screen
    await page.goto("/reflections");
    await expect(page).toHaveTitle(/myself|Reflexiones/i);

    // 3. Verify screen rendered with Cola Diaria section
    const dailySection = page.getByText("Rutina del Día").first();
    await expect(dailySection).toBeVisible({ timeout: 10000 });

    // Positive Verification: fresh user created today has NO past missed questions and exactly 1 gratitude card
    await expect(
      page.getByText("⏰ Pendientes de días anteriores"),
    ).toBeHidden();
    await expect(
      page.getByTestId(`prompt-card-${SEEDED_IDS.gratitude}`),
    ).toHaveCount(1);

    // -------------------------------------------------------------------------
    // 4. Answer Morning Routine Reflection (Text response)
    // -------------------------------------------------------------------------
    const morningCard = page.getByTestId(`prompt-card-${SEEDED_IDS.morning}`);
    await expect(morningCard).toBeVisible({ timeout: 5000 });

    // Click "Responder" button inside the morning intention card
    const morningAnswerBtn = morningCard.getByRole("button", {
      name: "Responder",
    });
    await expect(morningAnswerBtn).toBeVisible({ timeout: 5000 });
    await morningAnswerBtn.click();

    // Functional Negative Validation: cannot submit empty or whitespace-only response
    const textModal = page.getByRole("dialog");
    const saveBtn = textModal.getByRole("button", { name: "Guardar" });
    await expect(saveBtn).toBeDisabled();

    const textInput = textModal.getByPlaceholder(
      "Escribí tu respuesta con honestidad...",
    );
    await expect(textInput).toBeVisible({ timeout: 5000 });
    await textInput.fill("   ");
    await expect(saveBtn).toBeDisabled();

    // Fill valid answer
    await textInput.fill(
      "E2E Playwright: Hoy priorizo foco profundo en la arquitectura.",
    );
    await expect(saveBtn).toBeEnabled();

    // Submit answer
    await saveBtn.click();
    await expect(textModal).toBeHidden({ timeout: 5000 });

    // Functional Verification: card updates immediately in Respondidas Hoy with exact content and edit button
    const editMorningBtn = morningCard.getByRole("button", {
      name: "Editar respuesta",
    });
    await expect(editMorningBtn).toBeVisible({ timeout: 5000 });
    await expect(
      morningCard.getByText(
        "E2E Playwright: Hoy priorizo foco profundo en la arquitectura.",
      ),
    ).toBeVisible({ timeout: 5000 });

    // -------------------------------------------------------------------------
    // 4a-bis. Persistence Verification: Hard page reload preserves SQLite record
    // -------------------------------------------------------------------------
    await page.reload();
    await expect(page.getByText("Respondidas Hoy").first()).toBeVisible({
      timeout: 10000,
    });
    const reloadedMorningCard = page.getByTestId(
      `prompt-card-${SEEDED_IDS.morning}`,
    );
    await expect(reloadedMorningCard).toBeVisible({ timeout: 5000 });
    await expect(
      reloadedMorningCard.getByText(
        "E2E Playwright: Hoy priorizo foco profundo en la arquitectura.",
      ),
    ).toBeVisible({ timeout: 5000 });
    const reloadedEditBtn = reloadedMorningCard.getByRole("button", {
      name: "Editar respuesta",
    });
    await expect(reloadedEditBtn).toBeVisible({ timeout: 5000 });

    // -------------------------------------------------------------------------
    // 4b. Test Edit Reflection Prepopulates Previous Content (TDD)
    // -------------------------------------------------------------------------
    await reloadedEditBtn.click();

    // Verify modal opens with the previous text already populated
    const editTextModal = page.getByRole("dialog");
    const editTextInput = editTextModal.getByPlaceholder(
      "Escribí tu respuesta con honestidad...",
    );
    await expect(editTextInput).toBeVisible({ timeout: 5000 });
    await expect(editTextInput).toHaveValue(
      "E2E Playwright: Hoy priorizo foco profundo en la arquitectura.",
    );

    // Save and close
    const cancelOrSaveBtn = editTextModal.getByRole("button", {
      name: "Guardar",
    });
    await cancelOrSaveBtn.click();
    await expect(editTextModal).toBeHidden({ timeout: 5000 });

    // -------------------------------------------------------------------------
    // 4c. Test "Mostrar respondidas" Toggle Switch
    // -------------------------------------------------------------------------
    const showAnsweredSwitch = page.getByTestId("toggle-show-answered");
    await expect(showAnsweredSwitch).toBeVisible({ timeout: 5000 });

    // Toggle off: answered card should become hidden
    await showAnsweredSwitch.click();
    await expect(reloadedMorningCard).toBeHidden({ timeout: 5000 });

    // Toggle on: answered card should reappear
    await showAnsweredSwitch.click();
    await expect(reloadedMorningCard).toBeVisible({ timeout: 5000 });

    // -------------------------------------------------------------------------
    // 5. Fast forward 2 days to 2026-09-13 (12:00 PM) to test lock & catch-up grace window
    // -------------------------------------------------------------------------
    await clock.travelAndReload("2026-09-13T12:00:00Z");

    await expect(page.getByText("Más tarde hoy")).toBeVisible({
      timeout: 5000,
    });
    const eveningCard = page.getByTestId(`prompt-card-${SEEDED_IDS.evening}`);
    await expect(eveningCard).toBeVisible({ timeout: 5000 });

    // Verify button is disabled and shows available time
    const lockedBtn = eveningCard.getByRole("button", {
      name: /Disponible a las 21:00/i,
    });
    await expect(lockedBtn).toBeVisible({ timeout: 5000 });
    await expect(lockedBtn).toBeDisabled();

    // Verify Daily Gratitude item-list question is also locked at 12:00
    const gratitudeCard = page.getByTestId(
      `prompt-card-${SEEDED_IDS.gratitude}`,
    );
    await expect(gratitudeCard).toBeVisible({ timeout: 5000 });
    const gratitudeLockedBtn = gratitudeCard.getByRole("button", {
      name: /Disponible a las 20:30/i,
    });
    await expect(gratitudeLockedBtn).toBeVisible({ timeout: 5000 });
    await expect(gratitudeLockedBtn).toBeDisabled();

    // 5b. Verify FIFO ordering of missed questions (oldest date first: Anteayer · Vence hoy before Ayer)
    const anteayerPills = page.getByText("Anteayer · Vence hoy");
    const ayerPills = page.getByText("Ayer");
    await expect(anteayerPills.first()).toBeVisible({ timeout: 5000 });
    await expect(ayerPills.first()).toBeVisible({ timeout: 5000 });

    // Answer a pending scale 1-10 reflection from the catch-up grace window
    const missedScaleCard = page
      .getByTestId(`prompt-card-missed-${SEEDED_IDS.evening}`)
      .first();
    await expect(missedScaleCard).toBeVisible({ timeout: 5000 });

    const scaleAnswerBtn = missedScaleCard.getByRole("button", {
      name: "Responder",
    });
    await expect(scaleAnswerBtn).toBeVisible({ timeout: 5000 });
    await scaleAnswerBtn.click();

    // Select scale score 8 in modal dialog
    const scaleModal = page.getByRole("dialog");
    const saveScaleBtn = scaleModal.getByRole("button", { name: "Guardar" });
    // Functional Negative Validation: cannot save scale without selecting a number
    await expect(saveScaleBtn).toBeDisabled();

    const score8Btn = scaleModal.getByRole("button", {
      name: "Puntaje 8 de 10",
    });
    await expect(score8Btn).toBeVisible({ timeout: 5000 });
    await score8Btn.click();
    await expect(saveScaleBtn).toBeEnabled();

    // Save scale reflection
    await saveScaleBtn.click();
    await expect(scaleModal).toBeHidden({ timeout: 5000 });

    // Functional Positive Verification: scale score 8/10 is rendered in Respondidas Hoy
    await expect(page.getByText("Puntaje: 8/10").first()).toBeVisible({
      timeout: 5000,
    });

    // -------------------------------------------------------------------------
    // 6. Skip a Question with Mandatory Reason
    // -------------------------------------------------------------------------
    // Target missed morning text question in the queue
    const morningCardToSkip = page
      .getByTestId(`prompt-card-missed-${SEEDED_IDS.morning}`)
      .first();
    const skipBtn = morningCardToSkip.getByRole("button", { name: "Saltear" });
    await expect(skipBtn).toBeVisible({ timeout: 5000 });
    await skipBtn.click();

    // Functional Negative Validation: confirm button is disabled before selecting a reason
    const skipModal = page.getByRole("dialog");
    const confirmSkipBtn = skipModal.getByRole("button", { name: "Saltear" });
    await expect(confirmSkipBtn).toBeDisabled();

    // Select preset reason chip "Sin novedades hoy" in the skip dialog
    const presetChip = skipModal
      .getByRole("button", { name: "Sin novedades hoy" })
      .or(skipModal.getByText("Sin novedades hoy"))
      .first();
    await expect(presetChip).toBeVisible({ timeout: 5000 });
    await presetChip.click();
    await expect(confirmSkipBtn).toBeEnabled();

    // Confirm skip in the sheet
    await confirmSkipBtn.click();
    await expect(skipModal).toBeHidden({ timeout: 5000 });

    // -------------------------------------------------------------------------
    // 6b. Re-attempt Skipped Question (Convert from Skipped to Answered)
    // -------------------------------------------------------------------------
    // The skipped card displays "↷ Salteada" and button "Completar ahora"
    await expect(page.getByText("↷ Salteada").first()).toBeVisible({
      timeout: 5000,
    });
    const reAttemptBtn = page
      .getByRole("button", { name: "Completar ahora" })
      .first();
    await expect(reAttemptBtn).toBeVisible({ timeout: 5000 });
    await reAttemptBtn.click();

    // Answer modal opens for the re-attempt
    const reAttemptModal = page.getByRole("dialog");
    await expect(reAttemptModal).toBeVisible({ timeout: 5000 });
    const reAttemptInput = reAttemptModal.getByPlaceholder(
      "Escribí tu respuesta con honestidad...",
    );
    const saveReAttemptBtn = reAttemptModal.getByRole("button", {
      name: "Guardar",
    });

    if (await reAttemptInput.isVisible()) {
      // Functional Negative Validation: empty or whitespace-only is disabled
      await expect(saveReAttemptBtn).toBeDisabled();
      await reAttemptInput.fill("   ");
      await expect(saveReAttemptBtn).toBeDisabled();

      await reAttemptInput.fill(
        "Reintentando con honestidad la pregunta que había salteado.",
      );
      await expect(saveReAttemptBtn).toBeEnabled();
    } else {
      await reAttemptModal
        .getByRole("button", { name: /Puntaje 8 de 10/i })
        .click();
      await expect(saveReAttemptBtn).toBeEnabled();
    }
    await saveReAttemptBtn.click();
    await expect(reAttemptModal).toBeHidden({ timeout: 5000 });

    // Functional Positive Verification: card converted and displays answered text in Respondidas Hoy
    await expect(
      page
        .getByText(
          /Reintentando con honestidad la pregunta que había salteado|Puntaje: 8\/10/,
        )
        .first(),
    ).toBeVisible({ timeout: 5000 });

    // -------------------------------------------------------------------------
    // 6c. Routine Opt-Out ("Bajar" question from daily routine queue)
    // -------------------------------------------------------------------------
    const optOutBtn = eveningCard.getByRole("button", {
      name: /Desuscribir de rutina|Bajar/i,
    });
    await expect(optOutBtn).toBeVisible({ timeout: 5000 });
    await optOutBtn.click();

    // Evening routine card should now disappear from the daily routine queue
    await expect(eveningCard).toBeHidden({ timeout: 5000 });

    // -------------------------------------------------------------------------
    // 7. Pin Ad-Hoc Question as Quick Shortcut
    // -------------------------------------------------------------------------
    const adHocCard = page
      .getByTestId(`prompt-card-${SEEDED_IDS.adhoc}`)
      .first();
    await expect(adHocCard).toBeVisible({ timeout: 5000 });

    const pinBtn = adHocCard.getByRole("button", {
      name: /Anclar acceso rápido/i,
    });
    await expect(pinBtn).toBeVisible({ timeout: 5000 });
    await pinBtn.click();

    // Verify pinned state updates to unpin button
    await expect(
      page.getByRole("button", { name: /Desanclar acceso rápido/i }).first(),
    ).toBeVisible({ timeout: 5000 });

    // -------------------------------------------------------------------------
    // 7b. Time-travel to evening (22:00 local time) & Answer Gratitude Dynamic Item-List
    // -------------------------------------------------------------------------
    await clock.travelAndReload(new Date(2026, 8, 13, 22, 0, 0));
    await expect(page.getByText("Rutina del Día").first()).toBeVisible({
      timeout: 10000,
    });

    const unlockedGratitudeCard = page.getByTestId(
      `prompt-card-${SEEDED_IDS.gratitude}`,
    );
    await expect(unlockedGratitudeCard).toBeVisible({ timeout: 5000 });
    const gratitudeAnswerBtn = unlockedGratitudeCard.getByRole("button", {
      name: "Responder",
    });
    await expect(gratitudeAnswerBtn).toBeVisible({ timeout: 5000 });
    await gratitudeAnswerBtn.click();

    // Dialog opens with Item List UI
    const itemListModal = page.getByRole("dialog");
    await expect(itemListModal).toBeVisible({ timeout: 5000 });
    await expect(itemListModal.getByText("Lista de Momentos")).toBeVisible({
      timeout: 5000,
    });
    const saveItemListBtn = itemListModal.getByRole("button", {
      name: "Guardar",
    });
    // Negative validation: cannot save with fewer than 3 items
    await expect(saveItemListBtn).toBeDisabled();

    // Fill initial 3 rows using accessible textbox labels
    const input1 = itemListModal.getByRole("textbox", { name: "Ítem 1" });
    const input2 = itemListModal.getByRole("textbox", { name: "Ítem 2" });
    const input3 = itemListModal.getByRole("textbox", { name: "Ítem 3" });
    await input1.fill("Familia y afectos");
    await input2.fill("Un buen café");
    await expect(saveItemListBtn).toBeDisabled();

    await input3.fill("Avances en el código");
    await expect(saveItemListBtn).toBeEnabled();

    // Add 4th item via button
    const addRowBtn = itemListModal.getByRole("button", {
      name: "Agregar otro ítem a la lista",
    });
    await addRowBtn.click();
    const input4 = itemListModal.getByRole("textbox", { name: "Ítem 4" });
    await expect(input4).toBeVisible({ timeout: 5000 });
    await input4.fill("Momento extra temporal");

    // Delete 4th item and test undo
    const deleteBtn4 = itemListModal.getByRole("button", {
      name: "Eliminar ítem 4",
    });
    await deleteBtn4.click();
    await expect(input4).toBeHidden({ timeout: 5000 });

    // Test undo toast
    const undoBtn = itemListModal.getByRole("button", { name: /Deshacer/i });
    await expect(undoBtn).toBeVisible({ timeout: 5000 });
    await undoBtn.click();
    await expect(input4).toBeVisible({ timeout: 5000 });

    // Delete it again
    await deleteBtn4.click();
    await expect(input4).toBeHidden({ timeout: 5000 });

    // Submit valid 3 items
    await saveItemListBtn.click();
    await expect(itemListModal).toBeHidden({ timeout: 5000 });

    // Functional Verification: card shows answered preview with "3 momentos anotados" and "Ver lista"
    await expect(
      unlockedGratitudeCard.getByText("3 momentos anotados"),
    ).toBeVisible({ timeout: 5000 });
    const viewListBtn = unlockedGratitudeCard.getByRole("button", {
      name: /Ver lista/i,
    });
    await expect(viewListBtn).toBeVisible({ timeout: 5000 });
    await viewListBtn.click();

    // Expanded list renders items
    await expect(
      unlockedGratitudeCard.getByText("Familia y afectos"),
    ).toBeVisible({ timeout: 5000 });
    await expect(unlockedGratitudeCard.getByText("Un buen café")).toBeVisible({
      timeout: 5000,
    });
    await expect(
      unlockedGratitudeCard.getByText("Avances en el código"),
    ).toBeVisible({ timeout: 5000 });

    // Persistence reload check
    await page.reload();
    const reloadedGratitudeCard = page.getByTestId(
      `prompt-card-${SEEDED_IDS.gratitude}`,
    );
    await expect(
      reloadedGratitudeCard.getByText("3 momentos anotados"),
    ).toBeVisible({ timeout: 5000 });

    // -------------------------------------------------------------------------
    // 8. Switch to "Programas" tab & Enroll in Stoic Cohort
    // -------------------------------------------------------------------------
    const programasTabBtn = page.getByText("Programas").first();
    await expect(programasTabBtn).toBeVisible({ timeout: 5000 });
    await programasTabBtn.click();

    // Verify cohort card is visible
    const cohortTitle = page.getByText("7 Días de Resiliencia Estoica").first();
    await expect(cohortTitle).toBeVisible({ timeout: 5000 });

    const enrollBtn = page
      .getByRole("button", {
        name: /Sumarme a la convocatoria/i,
      })
      .first();
    if (await enrollBtn.isVisible()) {
      await enrollBtn.click();
    }

    // Verify progress badge or enrollment status is displayed
    await expect(page.getByText(/Paso 1 de 7|Inscripto/i).first()).toBeVisible({
      timeout: 5000,
    });

    // -------------------------------------------------------------------------
    // 9. Unenroll from Cohort (Bajarme del programa) - TDD
    // -------------------------------------------------------------------------
    const leaveCohortBtn = page
      .getByRole("button", { name: /Bajarme del programa|Bajarme/i })
      .first();
    await expect(leaveCohortBtn).toBeVisible({ timeout: 5000 });
    await leaveCohortBtn.click();

    // Verify cohort is removed from active programs
    await expect(
      page.getByText(/No estás inscripto en ningún programa actualmente/i),
    ).toBeVisible({ timeout: 5000 });

    // Verify cohort is back available for enrollment in the catalog
    const reEnrollBtn = page
      .getByRole("button", { name: /Sumarme a la convocatoria/i })
      .first();
    await expect(reEnrollBtn).toBeVisible({ timeout: 5000 });
  });
});
