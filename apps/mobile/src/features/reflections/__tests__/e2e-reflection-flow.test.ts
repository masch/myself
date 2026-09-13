import { describe, expect, it, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import {
  generateEntityId,
  SHARED_MIGRATIONS,
  type EntityId,
} from "@myself/shared";
import { SqliteReflectionRepository } from "../infrastructure/sqlite-reflection.repository";
import { runMigrations } from "../../../infrastructure/persistence/migrator";
import { seedDatabase } from "../../../infrastructure/persistence/seed";

function createExpoSqliteAdapter(rawDb: Database) {
  return {
    async getAllAsync<T>(sql: string, params: any[] = []): Promise<T[]> {
      const stmt = rawDb.query(sql);
      return stmt.all(...params) as T[];
    },
    async getFirstAsync<T>(sql: string, params: any[] = []): Promise<T | null> {
      const stmt = rawDb.query(sql);
      const res = stmt.get(...params) as T | undefined;
      return res ?? null;
    },
    async runAsync(sql: string, params: any[] = []): Promise<any> {
      const stmt = rawDb.query(sql);
      return stmt.run(...params);
    },
    async execAsync(sql: string): Promise<void> {
      rawDb.run(sql);
    },
    async withTransactionAsync<T>(callback: () => Promise<T>): Promise<T> {
      rawDb.run("BEGIN IMMEDIATE;");
      try {
        const result = await callback();
        rawDb.run("COMMIT;");
        return result;
      } catch (err) {
        rawDb.run("ROLLBACK;");
        throw err;
      }
    },
  } as any;
}

describe("E2E Vertical Integration: All 10 Seeded Reflections Registration Flow", () => {
  let rawDb: Database;
  let db: any;
  let repo: SqliteReflectionRepository;
  let userId: EntityId;

  beforeEach(async () => {
    rawDb = new Database(":memory:");
    db = createExpoSqliteAdapter(rawDb);

    // Apply shared migrations to populate schema and seed questions
    await runMigrations(db, SHARED_MIGRATIONS);
    await seedDatabase(db);
    repo = new SqliteReflectionRepository(db);

    userId = generateEntityId();
    await db.runAsync(
      "INSERT INTO users (id, name, email, created_at) VALUES (?, ?, ?, datetime('now'))",
      [userId, "Filósofo Práctico", "filosofo@example.com"],
    );
  });

  it("registers every single one of the 10 loaded reflections across thematic cohorts, daily routines, and ad-hoc shortcuts", async () => {
    // -------------------------------------------------------------------------
    // Phase 1: Verify Seed Integrity (10 questions loaded)
    // -------------------------------------------------------------------------
    const openCohorts = await repo.getOpenCohorts();
    expect(openCohorts.length).toBeGreaterThanOrEqual(1);
    const stoicCohort = openCohorts[0];

    const cohortQuestions = await repo.getQuestionsForTheme(
      stoicCohort.themeId,
    );
    expect(cohortQuestions.length).toBe(7);

    const routineQuestions = await repo.getDailyRoutineQuestions(userId);
    expect(routineQuestions.length).toBe(2);

    const adHocQuestions = await repo.getAdHocQuestions();
    expect(adHocQuestions.length).toBe(1);

    const totalQuestionsCount =
      cohortQuestions.length + routineQuestions.length + adHocQuestions.length;
    expect(totalQuestionsCount).toBe(10);

    // -------------------------------------------------------------------------
    // Phase 2: Cohort Progression - Complete all 7 questions in order
    // -------------------------------------------------------------------------
    const enrollment = await repo.enrollInCohort(
      userId,
      stoicCohort.themeId,
      stoicCohort.id,
    );
    expect(enrollment.currentStep).toBe(1);
    expect(enrollment.status).toBe("in_progress");

    // Step 1: Text reflection
    expect(cohortQuestions[0].responseType).toBe("text");
    await repo.saveReflection({
      userId,
      questionId: cohortQuestions[0].id,
      themeId: stoicCohort.themeId,
      cycleRunId: enrollment.id,
      status: "answered",
      responseType: "text",
      content: "Día 1: Me enfoqué en separar lo que controlo de lo que no.",
      forDate: "2026-09-15",
    });

    let progress = await repo.getCohortProgressById(enrollment.id);
    expect(progress?.currentStep).toBe(2);
    expect(progress?.answeredCount).toBe(1);

    // Step 2: Scale 1-10 reflection
    expect(cohortQuestions[1].responseType).toBe("scale_1_10");
    await repo.saveReflection({
      userId,
      questionId: cohortQuestions[1].id,
      themeId: stoicCohort.themeId,
      cycleRunId: enrollment.id,
      status: "answered",
      responseType: "scale_1_10",
      numericValue: 9,
      forDate: "2026-09-16",
    });

    progress = await repo.getCohortProgressById(enrollment.id);
    expect(progress?.currentStep).toBe(3);
    expect(progress?.answeredCount).toBe(2);

    // Step 3: Skip question with mandatory reason
    expect(cohortQuestions[2].responseType).toBe("text");
    await repo.saveReflection({
      userId,
      questionId: cohortQuestions[2].id,
      themeId: stoicCohort.themeId,
      cycleRunId: enrollment.id,
      status: "skipped",
      responseType: "text",
      skipReason: "Jornada de viaje sin tiempo para incomodidad voluntaria",
      forDate: "2026-09-17",
    });

    progress = await repo.getCohortProgressById(enrollment.id);
    expect(progress?.currentStep).toBe(4);
    expect(progress?.skippedCount).toBe(1);

    // Step 4: Text reflection
    expect(cohortQuestions[3].responseType).toBe("text");
    await repo.saveReflection({
      userId,
      questionId: cohortQuestions[3].id,
      themeId: stoicCohort.themeId,
      cycleRunId: enrollment.id,
      status: "answered",
      responseType: "text",
      content: "Día 4: Noté pérdida de foco durante una reunión imprevista.",
      forDate: "2026-09-18",
    });

    progress = await repo.getCohortProgressById(enrollment.id);
    expect(progress?.currentStep).toBe(5);

    // Step 5: Scale 1-10 reflection
    expect(cohortQuestions[4].responseType).toBe("scale_1_10");
    await repo.saveReflection({
      userId,
      questionId: cohortQuestions[4].id,
      themeId: stoicCohort.themeId,
      cycleRunId: enrollment.id,
      status: "answered",
      responseType: "scale_1_10",
      numericValue: 8,
      forDate: "2026-09-19",
    });

    progress = await repo.getCohortProgressById(enrollment.id);
    expect(progress?.currentStep).toBe(6);

    // Step 6: Text reflection
    expect(cohortQuestions[5].responseType).toBe("text");
    await repo.saveReflection({
      userId,
      questionId: cohortQuestions[5].id,
      themeId: stoicCohort.themeId,
      cycleRunId: enrollment.id,
      status: "answered",
      responseType: "text",
      content: "Día 6: Asumí el error de cálculo con transparencia total.",
      forDate: "2026-09-20",
    });

    progress = await repo.getCohortProgressById(enrollment.id);
    expect(progress?.currentStep).toBe(7);

    // Step 7: Final text reflection -> completes cycle
    expect(cohortQuestions[6].responseType).toBe("text");
    await repo.saveReflection({
      userId,
      questionId: cohortQuestions[6].id,
      themeId: stoicCohort.themeId,
      cycleRunId: enrollment.id,
      status: "answered",
      responseType: "text",
      content: "Día 7: Agradecido por la templanza desarrollada esta semana.",
      forDate: "2026-09-21",
    });

    progress = await repo.getCohortProgressById(enrollment.id);
    expect(progress?.status).toBe("completed");
    expect(progress?.completedAt).not.toBeNull();
    expect(progress?.answeredCount).toBe(6);
    expect(progress?.skippedCount).toBe(1);

    // Re-attempt the skipped question (Step 3) within grace window
    await repo.saveReflection({
      userId,
      questionId: cohortQuestions[2].id,
      themeId: stoicCohort.themeId,
      cycleRunId: enrollment.id,
      status: "answered",
      responseType: "text",
      content: "Día 3 (recuperado): Elegí ducharme con agua fría al llegar.",
      forDate: "2026-09-17",
    });

    progress = await repo.getCohortProgressById(enrollment.id);
    expect(progress?.status).toBe("completed");
    expect(progress?.answeredCount).toBe(7);
    expect(progress?.skippedCount).toBe(0);

    // -------------------------------------------------------------------------
    // Phase 3: Daily Routine Reflections (Morning Text & Evening Scale)
    // -------------------------------------------------------------------------
    const morningQuestion = routineQuestions.find(
      (q) => q.preferredTimeOfDay === "08:00",
    );
    expect(morningQuestion).toBeDefined();
    expect(morningQuestion?.responseType).toBe("text");

    await repo.saveReflection({
      userId,
      questionId: morningQuestion!.id,
      themeId: null,
      cycleRunId: null,
      status: "answered",
      responseType: "text",
      content:
        "Intención matutina: Profundizar en la calidad antes de la velocidad.",
      forDate: "2026-09-22",
    });

    const eveningQuestion = routineQuestions.find(
      (q) => q.preferredTimeOfDay === "21:00",
    );
    expect(eveningQuestion).toBeDefined();
    expect(eveningQuestion?.responseType).toBe("scale_1_10");

    await repo.saveReflection({
      userId,
      questionId: eveningQuestion!.id,
      themeId: null,
      cycleRunId: null,
      status: "answered",
      responseType: "scale_1_10",
      numericValue: 9,
      forDate: "2026-09-22",
    });

    // Verify daily routine reflections recorded
    const morningRef = await repo.getReflectionForQuestionAndDate(
      userId,
      morningQuestion!.id,
      "2026-09-22",
    );
    expect(morningRef?.content).toBe(
      "Intención matutina: Profundizar en la calidad antes de la velocidad.",
    );

    const eveningRef = await repo.getReflectionForQuestionAndDate(
      userId,
      eveningQuestion!.id,
      "2026-09-22",
    );
    expect(eveningRef?.numericValue).toBe(9);

    // -------------------------------------------------------------------------
    // Phase 4: Ad-Hoc Reflection & Shortcut Pinning
    // -------------------------------------------------------------------------
    const adHocQuestion = adHocQuestions[0];
    expect(adHocQuestion.periodicity).toBe("ad_hoc");
    expect(adHocQuestion.responseType).toBe("text");

    // Pin as shortcut
    await repo.setAdHocShortcut(userId, adHocQuestion.id, true);
    const prefs = await repo.getUserPreferences(userId);
    const pinnedPref = prefs.find((p) => p.questionId === adHocQuestion.id);
    expect(pinnedPref?.isPinnedShortcut).toBe(true);

    // Answer ad-hoc question
    await repo.saveReflection({
      userId,
      questionId: adHocQuestion.id,
      themeId: null,
      cycleRunId: null,
      status: "answered",
      responseType: "text",
      content:
        "Claridad emocional: Siento serenidad tras haber cerrado el hito con rigor.",
      forDate: "2026-09-22",
    });

    // -------------------------------------------------------------------------
    // Phase 5: Final Comprehensive Verification
    // -------------------------------------------------------------------------
    const fullHistory = await repo.getUserReflectionHistory(userId);
    expect(fullHistory.length).toBe(10);

    // Verify all 10 reflections belong to the test user and have status 'answered'
    expect(fullHistory.every((r) => r.userId === userId)).toBe(true);
    expect(fullHistory.every((r) => r.status === "answered")).toBe(true);

    // Verify exact count of text vs scale reflections
    const textReflections = fullHistory.filter(
      (r) => r.content !== null && r.content !== undefined,
    );
    const scaleReflections = fullHistory.filter(
      (r) => r.numericValue !== null && r.numericValue !== undefined,
    );

    expect(textReflections.length).toBe(7); // 5 in cohort + 1 morning routine + 1 ad-hoc
    expect(scaleReflections.length).toBe(3); // 2 in cohort + 1 evening routine

    // Verify cohort cycle run has all 7 reflections
    const cycleReflections = await repo.getReflectionsForCycleRun(
      enrollment.id,
    );
    expect(cycleReflections.length).toBe(7);
  });
});
