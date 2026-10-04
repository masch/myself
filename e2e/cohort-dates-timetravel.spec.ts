import { test, expect } from "@playwright/test";
import { TestClock } from "./helpers/clock";

test.describe("E2E Cohort Program Dates & Time Travel", () => {
  test("enforces cohort programStartDate: locks question before start date and unlocks on start date", async ({
    page,
  }) => {
    // 1. Install mock clock at 2026-09-13 (2 days BEFORE the Stoic cohort starts on 2026-09-15)
    const clock = await TestClock.install(page, "2026-09-13T12:00:00Z");

    // 2. Open reflections screen
    await page.goto("/reflections");
    await expect(page.getByText("Rutina del Día").first()).toBeVisible({
      timeout: 10000,
    });

    // 3. Switch to "Programas" tab
    const programasTabBtn = page.getByText("Programas").first();
    await programasTabBtn.click();

    // 4. Find open cohort starting on 2026-09-15 and enroll
    const openCohortCard = page.getByTestId("cohort-card-convocatoria-abierta");
    await expect(openCohortCard).toBeVisible({ timeout: 5000 });
    await expect(openCohortCard.getByText(/Comienza: 2026-09-15/i)).toBeVisible(
      {
        timeout: 5000,
      },
    );

    const enrollBtn = openCohortCard.getByRole("button", {
      name: /Sumarme a la convocatoria/i,
    });
    await expect(enrollBtn).toBeVisible({ timeout: 5000 });
    await enrollBtn.click();

    // 5. User is now enrolled, but today is 2026-09-13 (program starts 2026-09-15).
    // EXPECTATION:
    // The active cohort card must indicate that the program has not started yet.
    // The first question must NOT be answerable ahead of time.
    const waitingStatus = page
      .getByText(
        /El programa comienza el 15\/09|Comienza el 15\/09|Esperando inicio del programa/i,
      )
      .first();
    await expect(waitingStatus).toBeVisible({ timeout: 5000 });

    // The "Responder" button should not be available for premature submission
    const prematurAnswerBtn = page.getByRole("button", {
      name: /^Responder$/i,
    });
    await expect(prematurAnswerBtn).toHaveCount(0);

    // 6. TIME TRAVEL: Fast forward clock to 2026-09-15 (Start Date) at 20:30
    await clock.travelAndReload("2026-09-15T20:30:00Z");
    await page.getByText("Programas").first().click();

    // 7. On September 15, the first step is unlocked and ready to answer
    const activeQuestionPrompt = page.getByText(
      /¿Qué situaciones de hoy estuvieron completamente fuera de tu control/i,
    );
    await expect(activeQuestionPrompt).toBeVisible({ timeout: 5000 });

    const unlockedAnswerBtn = page
      .getByRole("button", { name: "Responder" })
      .first();
    await expect(unlockedAnswerBtn).toBeVisible({ timeout: 5000 });
    await expect(unlockedAnswerBtn).toBeEnabled();

    // Clean up enrollment for subsequent test
    const leaveCohortBtn = page
      .getByRole("button", { name: /Bajarme/i })
      .first();
    await expect(leaveCohortBtn).toBeVisible({ timeout: 5000 });
    await leaveCohortBtn.click();
    await expect(
      openCohortCard.getByRole("button", {
        name: /Sumarme a la convocatoria/i,
      }),
    ).toBeVisible({ timeout: 5000 });
  });

  test("joins program before start date, time-travels day by day, and completes all 7 questions to finish cycle", async ({
    page,
  }) => {
    test.setTimeout(60000);

    // 1. Install mock clock at 2026-09-13 (2 days before Stoic cohort starts on 2026-09-15)
    const clock = await TestClock.install(page, "2026-09-13T12:00:00Z");

    // 2. Open reflections screen
    await page.goto("/reflections");
    await expect(page.getByText("Rutina del Día").first()).toBeVisible({
      timeout: 10000,
    });

    // 3. Switch to "Programas" tab
    await page.getByText("Programas").first().click();

    // 4. Enroll in the cohort
    const openCohortCard = page.getByTestId("cohort-card-convocatoria-abierta");
    const enrollBtn = openCohortCard.getByRole("button", {
      name: /Sumarme a la convocatoria/i,
    });
    await expect(enrollBtn).toBeVisible({ timeout: 5000 });
    await enrollBtn.click();

    // Verify waiting status
    await expect(
      page
        .getByText(/El programa comienza el 15\/09|Comienza el 15\/09/i)
        .first(),
    ).toBeVisible({ timeout: 5000 });

    // 5. Complete all 7 questions across the 7 days of the program
    const days = [
      {
        date: "2026-09-15T20:30:00Z",
        type: "text" as const,
        answer: "Día 1: Acepté los retrasos con calma estoica.",
      },
      {
        date: "2026-09-16T20:30:00Z",
        type: "scale" as const,
        score: 8,
      },
      {
        date: "2026-09-17T20:30:00Z",
        type: "text" as const,
        answer: "Día 3: Duchas frías y caminatas bajo la lluvia.",
      },
      {
        date: "2026-09-18T20:30:00Z",
        type: "text" as const,
        answer: "Día 4: Reconocí las distracciones digitales.",
      },
      {
        date: "2026-09-19T20:30:00Z",
        type: "scale" as const,
        score: 9,
      },
      {
        date: "2026-09-20T20:30:00Z",
        type: "text" as const,
        answer: "Día 6: Cada tropiezo fortalece el carácter.",
      },
      {
        date: "2026-09-21T20:30:00Z",
        type: "text" as const,
        answer: "Día 7: Muy agradecido con el ciclo completado.",
      },
    ];

    for (let i = 0; i < days.length; i++) {
      const stepNumber = i + 1;
      const step = days[i];

      // Time travel to the specific date
      await clock.travelAndReload(step.date);
      await page.getByText("Programas").first().click();

      // Verify current step header
      await expect(
        page.getByText(`Pregunta de hoy (Paso ${stepNumber}):`),
      ).toBeVisible({ timeout: 5000 });

      // Click Responder on the active question card
      const answerBtn = page.getByRole("button", { name: "Responder" }).first();
      await expect(answerBtn).toBeVisible({ timeout: 5000 });
      await answerBtn.click();

      // Modal interaction
      const modal = page.getByRole("dialog");
      await expect(modal).toBeVisible({ timeout: 5000 });

      if (step.type === "scale") {
        const scoreBtn = modal.getByRole("button", {
          name: `Puntaje ${step.score} de 10`,
        });
        await expect(scoreBtn).toBeVisible({ timeout: 5000 });
        await scoreBtn.click();
      } else {
        const input = modal.getByPlaceholder(
          "Escribí tu respuesta con honestidad...",
        );
        await expect(input).toBeVisible({ timeout: 5000 });
        await input.fill(step.answer);
      }

      const saveBtn = modal.getByRole("button", { name: "Guardar" });
      await expect(saveBtn).toBeVisible({ timeout: 5000 });
      await saveBtn.click();
      await expect(modal).toBeHidden({ timeout: 5000 });
    }

    // 6. Verify Cycle Completion
    // Badge status and stats
    await expect(page.getByText("¡Ciclo Completado!")).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByText("Completado").first()).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByText("✓ 7 respondidas")).toBeVisible({
      timeout: 5000,
    });

    // Active question prompt should no longer be rendered
    await expect(page.getByText(/Pregunta de hoy/i)).toHaveCount(0);

    // All 7 completed steps should be listed in the archive section
    await expect(page.getByText("Pasos completados (7)")).toBeVisible({
      timeout: 5000,
    });

    // Functionally verify that actual answers and scores are persisted and displayed in the archive
    await expect(
      page.getByText("Día 1: Acepté los retrasos con calma estoica."),
    ).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Puntaje: 8/10").first()).toBeVisible({
      timeout: 5000,
    });
    await expect(
      page.getByText("Día 7: Muy agradecido con el ciclo completado."),
    ).toBeVisible({ timeout: 5000 });
  });

  test("enforces 2-day catch-up grace period: questions older than 2 days expire and disappear from queue", async ({
    page,
  }) => {
    // 1. Initial user registration on 2026-09-11
    const clock = await TestClock.install(page, "2026-09-11T12:00:00Z");
    await page.goto("/reflections");
    await expect(page.getByText("Rutina del Día").first()).toBeVisible({
      timeout: 10000,
    });
    // Fresh user on registration day has NO previous missed questions
    await expect(
      page.getByText("⏰ Pendientes de días anteriores"),
    ).toBeHidden();

    // 2. Fast forward 2 days to 2026-09-13: now missed questions from 2026-09-11 and 2026-09-12 are visible
    await clock.travelAndReload("2026-09-13T12:00:00Z");
    const gracePeriodHeader = page.getByText(
      "⏰ Pendientes de días anteriores",
    );
    await expect(gracePeriodHeader).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Anteayer · Vence hoy").first()).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByText("Ayer").first()).toBeVisible({ timeout: 5000 });

    // Verify raw ISO database string "Pendiente: YYYY-MM-DD" is completely absent from the DOM
    await expect(page.getByText(/Pendiente: \d{4}-\d{2}-\d{2}/)).toHaveCount(0);
  });

  test("enforces cohort late enrollment grace period: permits enrollment within grace window and disables after grace window expires", async ({
    page,
  }) => {
    // 1. Time travel to 2026-09-17 (2 days after start date 2026-09-15, which is within the 2-day grace period)
    const clock = await TestClock.install(page, "2026-09-17T12:00:00Z");
    await page.goto("/reflections");
    await page.getByText("Programas").first().click();

    const openCohortCard = page.getByTestId("cohort-card-convocatoria-abierta");

    // Cohort card should show open enrollment button and grace period info
    const enrollBtn = openCohortCard.getByRole("button", {
      name: /Sumarme a la convocatoria/i,
    });
    await expect(enrollBtn).toBeVisible({ timeout: 5000 });
    await expect(enrollBtn).toBeEnabled();
    await expect(
      openCohortCard.getByText(/Plazo de gracia para sumarte: 2 días/i),
    ).toBeVisible({
      timeout: 5000,
    });

    // 2. Time travel to 2026-09-18 (grace period expired: 3 days after start date)
    await clock.travelAndReload("2026-09-18T12:00:00Z");
    await page.getByText("Programas").first().click();

    const expiredCohortCard = page.getByTestId(
      "cohort-card-convocatoria-abierta",
    );

    // Button should now be disabled and show "Inscripción cerrada"
    const closedBtn = expiredCohortCard.getByRole("button", {
      name: /Inscripción cerrada/i,
    });
    await expect(closedBtn).toBeVisible({ timeout: 5000 });
    await expect(closedBtn).toBeDisabled();
    await expect(
      expiredCohortCard.getByText(/Inscripción cerrada/i).first(),
    ).toBeVisible({
      timeout: 5000,
    });
  });
});
