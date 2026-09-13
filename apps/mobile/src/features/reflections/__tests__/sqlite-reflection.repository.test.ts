import { describe, expect, it, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import {
  generateEntityId,
  SHARED_MIGRATIONS,
  type EntityId,
} from "@myself/shared";
import { SqliteReflectionRepository } from "../infrastructure/sqlite-reflection.repository";
import { ExpoNotificationAdapter } from "../infrastructure/expo-notification.adapter";
import { runMigrations } from "../../../infrastructure/persistence/migrator";
import { seedDatabase } from "../../../infrastructure/persistence/seed";
import { mockNotifications } from "../../../../test-setup";

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

describe("SqliteReflectionRepository & ExpoNotificationAdapter", () => {
  let rawDb: Database;
  let db: any;
  let repo: SqliteReflectionRepository;
  let testUserId: EntityId;

  beforeEach(async () => {
    rawDb = new Database(":memory:");
    db = createExpoSqliteAdapter(rawDb);

    // Apply shared migrations (creates users, categories, themes, cohorts, questions, etc.)
    await runMigrations(db, SHARED_MIGRATIONS);
    await seedDatabase(db);

    repo = new SqliteReflectionRepository(db);

    // Create a test user in DB
    testUserId = generateEntityId();
    await db.runAsync(
      "INSERT INTO users (id, name, email, created_at) VALUES (?, ?, ?, datetime('now'))",
      [testUserId, "Test User", "test@example.com"],
    );
  });

  describe("Catalog Queries & Seeds", () => {
    it("loads seeded categories and themes correctly", async () => {
      const categories = await repo.getCategories();
      expect(categories.length).toBeGreaterThanOrEqual(2);

      const stoicism = categories.find((c) => c.slug === "stoicism");
      expect(stoicism).toBeDefined();
      expect(stoicism?.name).toBe("Estoicismo");

      const themes = await repo.getThemes();
      expect(themes.length).toBeGreaterThanOrEqual(1);

      const stoicTheme = themes.find(
        (t) => t.title === "7 Días de Resiliencia Estoica",
      );
      expect(stoicTheme).toBeDefined();
      expect(stoicTheme?.targetQuestionCount).toBe(7);
      expect(stoicTheme?.catchUpWindowDays).toBe(2);
      expect(stoicTheme?.editWindowDays).toBe(3);
    });

    it("loads open cohorts and associated questions", async () => {
      const cohorts = await repo.getOpenCohorts();
      expect(cohorts.length).toBeGreaterThanOrEqual(1);

      const openCohort = cohorts[0];
      expect(openCohort.status).toBe("open_for_enrollment");

      const questions = await repo.getQuestionsForTheme(openCohort.themeId);
      expect(questions.length).toBe(7);
      expect(questions[0].orderIndex).toBe(1);
      expect(questions[0].responseType).toBe("text");
      expect(questions[1].orderIndex).toBe(2);
      expect(questions[1].responseType).toBe("scale_1_10");
    });
  });

  describe("Cohort Enrollment & Progression", () => {
    it("enrolls user into an open cohort idempotently", async () => {
      const cohorts = await repo.getOpenCohorts();
      const cohort = cohorts[0];

      const progress1 = await repo.enrollInCohort(
        testUserId,
        cohort.themeId,
        cohort.id,
      );
      expect(progress1.userId).toBe(testUserId);
      expect(progress1.cohortId).toBe(cohort.id);
      expect(progress1.themeId).toBe(cohort.themeId);
      expect(progress1.currentStep).toBe(1);
      expect(progress1.cycleRunNumber).toBe(1);
      expect(progress1.status).toBe("in_progress");

      // Second enrollment returns the existing active progress
      const progress2 = await repo.enrollInCohort(
        testUserId,
        cohort.themeId,
        cohort.id,
      );
      expect(progress2.id).toBe(progress1.id);
    });

    it("retrieves active cohort progress with current question details", async () => {
      const cohorts = await repo.getOpenCohorts();
      const cohort = cohorts[0];
      await repo.enrollInCohort(testUserId, cohort.themeId, cohort.id);

      const activeDetails = await repo.getUserActiveCohortProgress(testUserId);
      expect(activeDetails.length).toBeGreaterThan(0);
      const activeDetail = activeDetails[0];
      expect(activeDetail.cohort.name).toBe(cohort.name);
      expect(activeDetail.currentQuestion?.orderIndex).toBe(1);
      expect(activeDetail.currentStep).toBe(1);
    });

    it("allows leaving/unenrolling from an active cohort and re-enrolling", async () => {
      const cohorts = await repo.getOpenCohorts();
      const cohort = cohorts[0];

      await repo.enrollInCohort(testUserId, cohort.themeId, cohort.id);
      let activeList = await repo.getUserActiveCohortProgress(testUserId);
      expect(activeList.some((a) => a.cohortId === cohort.id)).toBe(true);

      // Leave cohort
      await repo.leaveCohort(testUserId, cohort.id);

      // Active progress should no longer include this cohort
      activeList = await repo.getUserActiveCohortProgress(testUserId);
      expect(activeList.some((a) => a.cohortId === cohort.id)).toBe(false);

      // Re-enrolling creates a fresh active cycle run
      const reEnrolled = await repo.enrollInCohort(
        testUserId,
        cohort.themeId,
        cohort.id,
      );
      expect(reEnrolled.status).toBe("in_progress");
      expect(reEnrolled.cycleRunNumber).toBe(2);
    });
  });

  describe("Reflection Submission (Text, Scale, Skip, Re-attempt)", () => {
    it("submits text reflection, updates progress and current_step", async () => {
      const cohorts = await repo.getOpenCohorts();
      const cohort = cohorts[0];
      const progress = await repo.enrollInCohort(
        testUserId,
        cohort.themeId,
        cohort.id,
      );
      const questions = await repo.getQuestionsForTheme(cohort.themeId);

      const step1Question = questions[0];
      const reflection = await repo.saveReflection({
        userId: testUserId,
        questionId: step1Question.id,
        themeId: cohort.themeId,
        cycleRunId: progress.id,
        status: "answered",
        responseType: "text",
        content: "Hoy enfrenté un retraso en el tren con serenidad.",
        forDate: "2026-09-12",
      });

      expect(reflection.id).toBeDefined();
      expect(reflection.status).toBe("answered");
      expect(reflection.content).toBe(
        "Hoy enfrenté un retraso en el tren con serenidad.",
      );

      // Verify progress advanced to step 2
      const updatedProgress = await repo.getCohortProgressById(progress.id);
      expect(updatedProgress?.currentStep).toBe(2);
      expect(updatedProgress?.answeredCount).toBe(1);
      expect(updatedProgress?.skippedCount).toBe(0);
    });

    it("submits numeric score (scale_1_10) reflection", async () => {
      const cohorts = await repo.getOpenCohorts();
      const cohort = cohorts[0];
      const progress = await repo.enrollInCohort(
        testUserId,
        cohort.themeId,
        cohort.id,
      );
      const questions = await repo.getQuestionsForTheme(cohort.themeId);

      // Complete step 1
      await repo.saveReflection({
        userId: testUserId,
        questionId: questions[0].id,
        themeId: cohort.themeId,
        cycleRunId: progress.id,
        status: "answered",
        responseType: "text",
        content: "Paso 1 completado.",
        forDate: "2026-09-12",
      });

      // Submit step 2 (scale question)
      const step2Question = questions[1];
      expect(step2Question.responseType).toBe("scale_1_10");

      const scaleReflection = await repo.saveReflection({
        userId: testUserId,
        questionId: step2Question.id,
        themeId: cohort.themeId,
        cycleRunId: progress.id,
        status: "answered",
        responseType: "scale_1_10",
        numericValue: 8,
        forDate: "2026-09-13",
      });

      expect(scaleReflection.numericValue).toBe(8);
      expect(scaleReflection.content).toBeNull();

      const updatedProgress = await repo.getCohortProgressById(progress.id);
      expect(updatedProgress?.currentStep).toBe(3);
      expect(updatedProgress?.answeredCount).toBe(2);
    });

    it("skips question with mandatory reason and advances step", async () => {
      const cohorts = await repo.getOpenCohorts();
      const cohort = cohorts[0];
      const progress = await repo.enrollInCohort(
        testUserId,
        cohort.themeId,
        cohort.id,
      );
      const questions = await repo.getQuestionsForTheme(cohort.themeId);

      const skippedReflection = await repo.saveReflection({
        userId: testUserId,
        questionId: questions[0].id,
        themeId: cohort.themeId,
        cycleRunId: progress.id,
        status: "skipped",
        responseType: "text",
        skipReason: "Día sin novedades relevantes para este ejercicio",
        forDate: "2026-09-12",
      });

      expect(skippedReflection.status).toBe("skipped");
      expect(skippedReflection.skipReason).toBe(
        "Día sin novedades relevantes para este ejercicio",
      );

      const updatedProgress = await repo.getCohortProgressById(progress.id);
      expect(updatedProgress?.currentStep).toBe(2);
      expect(updatedProgress?.answeredCount).toBe(0);
      expect(updatedProgress?.skippedCount).toBe(1);
    });

    it("allows re-attempting a skipped question, converting it to answered and updating counts", async () => {
      const cohorts = await repo.getOpenCohorts();
      const cohort = cohorts[0];
      const progress = await repo.enrollInCohort(
        testUserId,
        cohort.themeId,
        cohort.id,
      );
      const questions = await repo.getQuestionsForTheme(cohort.themeId);

      // 1. Skip step 1
      await repo.saveReflection({
        userId: testUserId,
        questionId: questions[0].id,
        themeId: cohort.themeId,
        cycleRunId: progress.id,
        status: "skipped",
        responseType: "text",
        skipReason: "No tuve tiempo en el momento",
        forDate: "2026-09-12",
      });

      let prog = await repo.getCohortProgressById(progress.id);
      expect(prog?.currentStep).toBe(2);
      expect(prog?.skippedCount).toBe(1);
      expect(prog?.answeredCount).toBe(0);

      // 2. Re-attempt step 1 later
      await repo.saveReflection({
        userId: testUserId,
        questionId: questions[0].id,
        themeId: cohort.themeId,
        cycleRunId: progress.id,
        status: "answered",
        responseType: "text",
        content: "Ahora sí puedo reflexionar sobre la mañana.",
        forDate: "2026-09-12",
      });

      prog = await repo.getCohortProgressById(progress.id);
      // Step remains 2 (it had already advanced), but counts are updated
      expect(prog?.skippedCount).toBe(0);
      expect(prog?.answeredCount).toBe(1);

      const reflections = await repo.getReflectionsForCycleRun(progress.id);
      expect(reflections.length).toBe(1);
      expect(reflections[0].status).toBe("answered");
      expect(reflections[0].content).toBe(
        "Ahora sí puedo reflexionar sobre la mañana.",
      );
    });

    it("completes cycle when reaching target count", async () => {
      const cohorts = await repo.getOpenCohorts();
      const cohort = cohorts[0];
      const progress = await repo.enrollInCohort(
        testUserId,
        cohort.themeId,
        cohort.id,
      );
      const questions = await repo.getQuestionsForTheme(cohort.themeId);

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        await repo.saveReflection({
          userId: testUserId,
          questionId: q.id,
          themeId: cohort.themeId,
          cycleRunId: progress.id,
          status: "answered",
          responseType: q.responseType,
          content:
            q.responseType === "text" ? `Respuesta día ${i + 1}` : undefined,
          numericValue: q.responseType === "scale_1_10" ? 9 : undefined,
          forDate: `2026-09-${12 + i}`,
        });
      }

      const completedProg = await repo.getCohortProgressById(progress.id);
      expect(completedProg?.status).toBe("completed");
      expect(completedProg?.completedAt).not.toBeNull();
      expect(completedProg?.answeredCount).toBe(7);
      expect(completedProg?.skippedCount).toBe(0);
    });
  });

  describe("Daily Routine Preferences & Opt-Out", () => {
    it("returns default suggested routine questions when no preference is set", async () => {
      const routine = await repo.getDailyRoutineQuestions(testUserId);
      expect(routine.length).toBeGreaterThanOrEqual(2);
      expect(routine.every((q) => q.isDefaultSuggested)).toBe(true);
    });

    it("allows opting out from a daily routine question", async () => {
      const initialRoutine = await repo.getDailyRoutineQuestions(testUserId);
      const targetQuestion = initialRoutine[0];

      // Opt out
      await repo.setRoutineOptOut(testUserId, targetQuestion.id, false);

      const updatedRoutine = await repo.getDailyRoutineQuestions(testUserId);
      expect(updatedRoutine.some((q) => q.id === targetQuestion.id)).toBe(
        false,
      );
      expect(updatedRoutine.length).toBe(initialRoutine.length - 1);

      // Opt back in
      await repo.setRoutineOptOut(testUserId, targetQuestion.id, true);
      const restoredRoutine = await repo.getDailyRoutineQuestions(testUserId);
      expect(restoredRoutine.some((q) => q.id === targetQuestion.id)).toBe(
        true,
      );
    });

    it("pins and unpins ad-hoc questions as shortcuts", async () => {
      const adHocQuestions = await repo.getAdHocQuestions();
      expect(adHocQuestions.length).toBeGreaterThanOrEqual(1);

      const question = adHocQuestions[0];
      await repo.setAdHocShortcut(testUserId, question.id, true);

      const preferences = await repo.getUserPreferences(testUserId);
      const pref = preferences.find((p) => p.questionId === question.id);
      expect(pref).toBeDefined();
      expect(pref?.isPinnedShortcut).toBe(true);

      // Unpin
      await repo.setAdHocShortcut(testUserId, question.id, false);
      const updatedPrefs = await repo.getUserPreferences(testUserId);
      const updatedPref = updatedPrefs.find(
        (p) => p.questionId === question.id,
      );
      expect(updatedPref?.isPinnedShortcut).toBe(false);
    });

    it("retrieves missed daily routine questions ordered chronologically (FIFO: oldest first)", async () => {
      const today = "2026-09-15";
      const missed = await repo.getMissedDailyQuestions(testUserId, today);
      expect(missed.length).toBeGreaterThanOrEqual(2);

      // Verify dates are ordered ascending (older date first: 2026-09-13 before 2026-09-14)
      for (let i = 0; i < missed.length - 1; i++) {
        expect(missed[i].missedDate <= missed[i + 1].missedDate).toBe(true);
      }
    });
  });

  describe("ExpoNotificationAdapter Integration", () => {
    it("requests permissions and schedules daily reminder", async () => {
      const adapter = new ExpoNotificationAdapter();

      const hasPermission = await adapter.requestPermissions();
      expect(hasPermission).toBe(true);

      const notificationId = await adapter.scheduleDailyReminder(
        "q-test-1",
        "08:30",
        "¿Cuál es tu prioridad innegociable?",
      );

      expect(notificationId).toBeTruthy();
      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalled();
    });

    it("cancels reminder for question", async () => {
      const adapter = new ExpoNotificationAdapter();
      await adapter.cancelReminderForQuestion("q-test-1");
      expect(
        mockNotifications.getAllScheduledNotificationsAsync,
      ).toHaveBeenCalled();
    });
  });
});
