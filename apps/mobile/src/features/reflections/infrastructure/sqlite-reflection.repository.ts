import type { SQLiteDatabase } from "expo-sqlite";
import {
  createReflectionInputSchema,
  generateEntityId,
  type CreateReflectionInput,
  type EntityId,
  type ReflectionCategory,
  type ReflectionQuestion,
  type ReflectionTheme,
  type ThemeCohort,
  type UserQuestionPreference,
  type UserReflection,
  type UserThemeProgress,
} from "@myself/shared";
import type {
  ActiveCohortProgressDetail,
  ReflectionRepositoryPort,
} from "../domain/ports/reflection.repository.port";

interface RawCategory {
  id: EntityId;
  slug: string;
  name: string;
  description: string;
  created_at: string;
}

interface RawTheme {
  id: EntityId;
  category_id: EntityId;
  title: string;
  description: string;
  target_question_count: number;
  catch_up_window_days: number;
  edit_window_days: number;
  created_at: string;
}

interface RawCohort {
  id: EntityId;
  theme_id: EntityId;
  name: string;
  enrollment_start_date: string;
  enrollment_end_date: string;
  program_start_date: string;
  status: "upcoming" | "open_for_enrollment" | "active" | "closed";
  created_at: string;
}

interface RawQuestion {
  id: EntityId;
  category_id: EntityId;
  theme_id: EntityId | null;
  prompt: string;
  periodicity: "daily" | "weekly" | "monthly" | "ad_hoc";
  preferred_time_of_day: string | null;
  response_type: "text" | "scale_1_10";
  is_default_suggested: number;
  order_index: number;
  created_at: string;
}

interface RawPreference {
  id: EntityId;
  user_id: EntityId;
  question_id: EntityId;
  is_enabled: number;
  is_pinned_shortcut: number;
  updated_at: string;
}

interface RawProgress {
  id: EntityId;
  user_id: EntityId;
  theme_id: EntityId;
  cohort_id: EntityId;
  cycle_run_number: number;
  current_step: number;
  answered_count: number;
  skipped_count: number;
  status: "in_progress" | "completed" | "cancelled";
  started_at: string;
  completed_at: string | null;
}

interface RawReflection {
  id: EntityId;
  user_id: EntityId;
  question_id: EntityId;
  theme_id: EntityId | null;
  cycle_run_id: EntityId | null;
  status: "answered" | "skipped";
  content: string | null;
  numeric_value: number | null;
  skip_reason: string | null;
  for_date: string;
  created_at: string;
  updated_at: string;
}

export class SqliteReflectionRepository implements ReflectionRepositoryPort {
  constructor(private readonly db: SQLiteDatabase) {}

  async getCategories(): Promise<ReflectionCategory[]> {
    const rows = await this.db.getAllAsync<RawCategory>(
      "SELECT id, slug, name, description, created_at FROM reflection_categories ORDER BY name ASC",
    );
    return rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      description: r.description ?? "",
      createdAt: r.created_at,
    }));
  }

  async getThemes(): Promise<ReflectionTheme[]> {
    const rows = await this.db.getAllAsync<RawTheme>(
      "SELECT id, category_id, title, description, target_question_count, catch_up_window_days, edit_window_days, created_at FROM reflection_themes ORDER BY created_at ASC",
    );
    return rows.map((r) => ({
      id: r.id,
      categoryId: r.category_id,
      title: r.title,
      description: r.description ?? "",
      targetQuestionCount: r.target_question_count,
      catchUpWindowDays: r.catch_up_window_days,
      editWindowDays: r.edit_window_days,
      createdAt: r.created_at,
    }));
  }

  async getOpenCohorts(): Promise<ThemeCohort[]> {
    const rows = await this.db.getAllAsync<RawCohort>(
      "SELECT id, theme_id, name, enrollment_start_date, enrollment_end_date, program_start_date, status, created_at FROM theme_cohorts WHERE status = 'open_for_enrollment' ORDER BY program_start_date ASC",
    );
    return rows.map((r) => ({
      id: r.id,
      themeId: r.theme_id,
      name: r.name,
      enrollmentStartDate: r.enrollment_start_date,
      enrollmentEndDate: r.enrollment_end_date,
      programStartDate: r.program_start_date,
      status: r.status,
      createdAt: r.created_at,
    }));
  }

  async getCohortById(cohortId: EntityId): Promise<ThemeCohort | null> {
    const r = await this.db.getFirstAsync<RawCohort>(
      "SELECT id, theme_id, name, enrollment_start_date, enrollment_end_date, program_start_date, status, created_at FROM theme_cohorts WHERE id = ?",
      [cohortId],
    );
    if (!r) return null;
    return {
      id: r.id,
      themeId: r.theme_id,
      name: r.name,
      enrollmentStartDate: r.enrollment_start_date,
      enrollmentEndDate: r.enrollment_end_date,
      programStartDate: r.program_start_date,
      status: r.status,
      createdAt: r.created_at,
    };
  }

  async getQuestionsForTheme(themeId: EntityId): Promise<ReflectionQuestion[]> {
    const rows = await this.db.getAllAsync<RawQuestion>(
      "SELECT id, category_id, theme_id, prompt, periodicity, preferred_time_of_day, response_type, is_default_suggested, order_index, created_at FROM reflection_questions WHERE theme_id = ? ORDER BY order_index ASC",
      [themeId],
    );
    return rows.map(this.mapQuestion);
  }

  async getAdHocQuestions(): Promise<ReflectionQuestion[]> {
    const rows = await this.db.getAllAsync<RawQuestion>(
      "SELECT id, category_id, theme_id, prompt, periodicity, preferred_time_of_day, response_type, is_default_suggested, order_index, created_at FROM reflection_questions WHERE periodicity = 'ad_hoc' ORDER BY prompt ASC",
    );
    return rows.map(this.mapQuestion);
  }

  async getDailyRoutineQuestions(
    userId: EntityId,
  ): Promise<ReflectionQuestion[]> {
    const rows = await this.db.getAllAsync<RawQuestion>(
      `SELECT q.id, q.category_id, q.theme_id, q.prompt, q.periodicity, q.preferred_time_of_day, q.response_type, q.is_default_suggested, q.order_index, q.created_at 
       FROM reflection_questions q
       LEFT JOIN user_question_preferences p ON p.question_id = q.id AND p.user_id = ?
       WHERE q.periodicity = 'daily' AND q.theme_id IS NULL AND (p.is_enabled IS NULL OR p.is_enabled = 1)
       ORDER BY q.preferred_time_of_day ASC, q.order_index ASC`,
      [userId],
    );
    return rows.map(this.mapQuestion);
  }

  async getUserPreferences(
    userId: EntityId,
  ): Promise<UserQuestionPreference[]> {
    const rows = await this.db.getAllAsync<RawPreference>(
      "SELECT id, user_id, question_id, is_enabled, is_pinned_shortcut, updated_at FROM user_question_preferences WHERE user_id = ?",
      [userId],
    );
    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      questionId: r.question_id,
      isEnabled: Boolean(r.is_enabled),
      isPinnedShortcut: Boolean(r.is_pinned_shortcut),
      updatedAt: r.updated_at,
    }));
  }

  async setRoutineOptOut(
    userId: EntityId,
    questionId: EntityId,
    isEnabled: boolean,
  ): Promise<void> {
    const existing = await this.db.getFirstAsync<{ id: EntityId }>(
      "SELECT id FROM user_question_preferences WHERE user_id = ? AND question_id = ?",
      [userId, questionId],
    );

    if (existing) {
      await this.db.runAsync(
        "UPDATE user_question_preferences SET is_enabled = ?, updated_at = datetime('now') WHERE id = ?",
        [isEnabled ? 1 : 0, existing.id],
      );
    } else {
      const id = generateEntityId();
      await this.db.runAsync(
        "INSERT INTO user_question_preferences (id, user_id, question_id, is_enabled, is_pinned_shortcut, updated_at) VALUES (?, ?, ?, ?, 0, datetime('now'))",
        [id, userId, questionId, isEnabled ? 1 : 0],
      );
    }
  }

  async setAdHocShortcut(
    userId: EntityId,
    questionId: EntityId,
    isPinned: boolean,
  ): Promise<void> {
    const existing = await this.db.getFirstAsync<{ id: EntityId }>(
      "SELECT id FROM user_question_preferences WHERE user_id = ? AND question_id = ?",
      [userId, questionId],
    );

    if (existing) {
      await this.db.runAsync(
        "UPDATE user_question_preferences SET is_pinned_shortcut = ?, updated_at = datetime('now') WHERE id = ?",
        [isPinned ? 1 : 0, existing.id],
      );
    } else {
      const id = generateEntityId();
      await this.db.runAsync(
        "INSERT INTO user_question_preferences (id, user_id, question_id, is_enabled, is_pinned_shortcut, updated_at) VALUES (?, ?, ?, 1, ?, datetime('now'))",
        [id, userId, questionId, isPinned ? 1 : 0],
      );
    }
  }

  async enrollInCohort(
    userId: EntityId,
    themeId: EntityId,
    cohortId: EntityId,
  ): Promise<UserThemeProgress> {
    const existing = await this.db.getFirstAsync<RawProgress>(
      "SELECT * FROM user_theme_progress WHERE user_id = ? AND cohort_id = ? AND status = 'in_progress'",
      [userId, cohortId],
    );
    if (existing) {
      return {
        id: existing.id,
        userId: existing.user_id,
        themeId: existing.theme_id,
        cohortId: existing.cohort_id,
        cycleRunNumber: existing.cycle_run_number,
        currentStep: existing.current_step,
        answeredCount: existing.answered_count,
        skippedCount: existing.skipped_count,
        status: existing.status,
        startedAt: existing.started_at,
        completedAt: existing.completed_at,
      };
    }

    const nextRunRow = await this.db.getFirstAsync<{ max_run: number | null }>(
      "SELECT MAX(cycle_run_number) AS max_run FROM user_theme_progress WHERE user_id = ? AND theme_id = ?",
      [userId, themeId],
    );
    const cycleRunNumber = (nextRunRow?.max_run ?? 0) + 1;
    const id = generateEntityId();
    const startedAt = new Date().toISOString();

    await this.db.runAsync(
      `INSERT INTO user_theme_progress (id, user_id, theme_id, cohort_id, cycle_run_number, current_step, answered_count, skipped_count, status, started_at)
       VALUES (?, ?, ?, ?, ?, 1, 0, 0, 'in_progress', ?)`,
      [id, userId, themeId, cohortId, cycleRunNumber, startedAt],
    );

    return {
      id,
      userId,
      themeId,
      cohortId,
      cycleRunNumber,
      currentStep: 1,
      answeredCount: 0,
      skippedCount: 0,
      status: "in_progress",
      startedAt,
    };
  }

  async getUserActiveCohortProgress(
    userId: EntityId,
  ): Promise<ActiveCohortProgressDetail[]> {
    const progressRows = await this.db.getAllAsync<RawProgress>(
      "SELECT id, user_id, theme_id, cohort_id, cycle_run_number, current_step, answered_count, skipped_count, status, started_at, completed_at FROM user_theme_progress WHERE user_id = ? AND status IN ('in_progress', 'completed') ORDER BY started_at DESC",
      [userId],
    );

    const results: ActiveCohortProgressDetail[] = [];

    for (const p of progressRows) {
      const themeRow = await this.db.getFirstAsync<RawTheme>(
        "SELECT id, category_id, title, description, target_question_count, catch_up_window_days, edit_window_days, created_at FROM reflection_themes WHERE id = ?",
        [p.theme_id],
      );
      const cohortRow = await this.db.getFirstAsync<RawCohort>(
        "SELECT id, theme_id, name, enrollment_start_date, enrollment_end_date, program_start_date, status, created_at FROM theme_cohorts WHERE id = ?",
        [p.cohort_id],
      );
      const questionRow = await this.db.getFirstAsync<RawQuestion>(
        "SELECT id, category_id, theme_id, prompt, periodicity, preferred_time_of_day, response_type, is_default_suggested, order_index, created_at FROM reflection_questions WHERE theme_id = ? AND order_index = ?",
        [p.theme_id, p.current_step],
      );

      if (themeRow && cohortRow) {
        results.push({
          id: p.id,
          userId: p.user_id,
          themeId: p.theme_id,
          cohortId: p.cohort_id,
          cycleRunNumber: p.cycle_run_number,
          currentStep: p.current_step,
          answeredCount: p.answered_count,
          skippedCount: p.skipped_count,
          status: p.status,
          startedAt: p.started_at,
          completedAt: p.completed_at,
          theme: {
            id: themeRow.id,
            categoryId: themeRow.category_id,
            title: themeRow.title,
            description: themeRow.description ?? "",
            targetQuestionCount: themeRow.target_question_count,
            catchUpWindowDays: themeRow.catch_up_window_days,
            editWindowDays: themeRow.edit_window_days,
            createdAt: themeRow.created_at,
          },
          cohort: {
            id: cohortRow.id,
            themeId: cohortRow.theme_id,
            name: cohortRow.name,
            enrollmentStartDate: cohortRow.enrollment_start_date,
            enrollmentEndDate: cohortRow.enrollment_end_date,
            programStartDate: cohortRow.program_start_date,
            status: cohortRow.status,
            createdAt: cohortRow.created_at,
          },
          currentQuestion: questionRow ? this.mapQuestion(questionRow) : null,
        });
      }
    }

    return results;
  }

  async getCohortProgressById(
    progressId: EntityId,
  ): Promise<UserThemeProgress | null> {
    const r = await this.db.getFirstAsync<RawProgress>(
      "SELECT id, user_id, theme_id, cohort_id, cycle_run_number, current_step, answered_count, skipped_count, status, started_at, completed_at FROM user_theme_progress WHERE id = ?",
      [progressId],
    );
    if (!r) return null;
    return {
      id: r.id,
      userId: r.user_id,
      themeId: r.theme_id,
      cohortId: r.cohort_id,
      cycleRunNumber: r.cycle_run_number,
      currentStep: r.current_step,
      answeredCount: r.answered_count,
      skippedCount: r.skipped_count,
      status: r.status,
      startedAt: r.started_at,
      completedAt: r.completed_at,
    };
  }

  async leaveCohort(userId: EntityId, cohortId: EntityId): Promise<void> {
    await this.db.runAsync(
      "UPDATE user_theme_progress SET status = 'cancelled' WHERE user_id = ? AND cohort_id = ? AND status = 'in_progress'",
      [userId, cohortId],
    );
  }

  async saveReflection(input: CreateReflectionInput): Promise<UserReflection> {
    const validated = createReflectionInputSchema.parse(input);
    const now = new Date().toISOString();

    let reflectionId: EntityId;

    await this.db.withTransactionAsync(async () => {
      // 1. Check existing reflection for this cycle_run / question
      const existing = validated.cycleRunId
        ? await this.db.getFirstAsync<RawReflection>(
            "SELECT id, status FROM user_reflections WHERE user_id = ? AND question_id = ? AND cycle_run_id = ?",
            [validated.userId, validated.questionId, validated.cycleRunId],
          )
        : await this.db.getFirstAsync<RawReflection>(
            "SELECT id, status FROM user_reflections WHERE user_id = ? AND question_id = ? AND for_date = ?",
            [validated.userId, validated.questionId, validated.forDate],
          );

      if (existing) {
        reflectionId = existing.id;
        await this.db.runAsync(
          `UPDATE user_reflections 
           SET status = ?, content = ?, numeric_value = ?, skip_reason = ?, updated_at = ?
           WHERE id = ?`,
          [
            validated.status,
            validated.status === "answered" && validated.responseType === "text"
              ? (validated.content ?? null)
              : null,
            validated.status === "answered" &&
            validated.responseType === "scale_1_10"
              ? (validated.numericValue ?? null)
              : null,
            validated.status === "skipped"
              ? (validated.skipReason ?? null)
              : null,
            now,
            reflectionId,
          ],
        );

        // If transitioning status in a cycle run, update counters accordingly:
        if (validated.cycleRunId && existing.status !== validated.status) {
          if (
            existing.status === "skipped" &&
            validated.status === "answered"
          ) {
            await this.db.runAsync(
              `UPDATE user_theme_progress 
               SET answered_count = answered_count + 1, skipped_count = MAX(0, skipped_count - 1)
               WHERE id = ?`,
              [validated.cycleRunId],
            );
          } else if (
            existing.status === "answered" &&
            validated.status === "skipped"
          ) {
            await this.db.runAsync(
              `UPDATE user_theme_progress 
               SET answered_count = MAX(0, answered_count - 1), skipped_count = skipped_count + 1
               WHERE id = ?`,
              [validated.cycleRunId],
            );
          }
        }
      } else {
        reflectionId = generateEntityId();
        await this.db.runAsync(
          `INSERT INTO user_reflections (id, user_id, question_id, theme_id, cycle_run_id, status, content, numeric_value, skip_reason, for_date, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            reflectionId,
            validated.userId,
            validated.questionId,
            validated.themeId ?? null,
            validated.cycleRunId ?? null,
            validated.status,
            validated.status === "answered" && validated.responseType === "text"
              ? (validated.content ?? null)
              : null,
            validated.status === "answered" &&
            validated.responseType === "scale_1_10"
              ? (validated.numericValue ?? null)
              : null,
            validated.status === "skipped"
              ? (validated.skipReason ?? null)
              : null,
            validated.forDate,
            now,
            now,
          ],
        );

        // Advance cycle progress if attached to a cycle run
        if (validated.cycleRunId && validated.themeId) {
          const progress = await this.db.getFirstAsync<RawProgress>(
            "SELECT id, current_step, answered_count, skipped_count FROM user_theme_progress WHERE id = ?",
            [validated.cycleRunId],
          );
          const theme = await this.db.getFirstAsync<{
            target_question_count: number;
          }>(
            "SELECT target_question_count FROM reflection_themes WHERE id = ?",
            [validated.themeId],
          );

          if (progress && theme) {
            const nextAnswered =
              validated.status === "answered"
                ? progress.answered_count + 1
                : progress.answered_count;
            const nextSkipped =
              validated.status === "skipped"
                ? progress.skipped_count + 1
                : progress.skipped_count;
            const isCompleted =
              nextAnswered + nextSkipped >= theme.target_question_count;

            await this.db.runAsync(
              `UPDATE user_theme_progress 
               SET answered_count = ?, skipped_count = ?, current_step = ?, status = ?, completed_at = ?
               WHERE id = ?`,
              [
                nextAnswered,
                nextSkipped,
                isCompleted ? progress.current_step : progress.current_step + 1,
                isCompleted ? "completed" : "in_progress",
                isCompleted ? now : null,
                validated.cycleRunId,
              ],
            );
          }
        }
      }
    });

    return {
      id: reflectionId!,
      userId: validated.userId,
      questionId: validated.questionId,
      themeId: validated.themeId ?? null,
      cycleRunId: validated.cycleRunId ?? null,
      status: validated.status,
      content:
        validated.status === "answered" && validated.responseType === "text"
          ? (validated.content ?? null)
          : null,
      numericValue:
        validated.status === "answered" &&
        validated.responseType === "scale_1_10"
          ? (validated.numericValue ?? null)
          : null,
      skipReason:
        validated.status === "skipped" ? (validated.skipReason ?? null) : null,
      forDate: validated.forDate,
      createdAt: now,
      updatedAt: now,
    };
  }

  async getReflectionForQuestionAndDate(
    userId: EntityId,
    questionId: EntityId,
    forDate: string,
  ): Promise<UserReflection | null> {
    const r = await this.db.getFirstAsync<RawReflection>(
      "SELECT id, user_id, question_id, theme_id, cycle_run_id, status, content, numeric_value, skip_reason, for_date, created_at, updated_at FROM user_reflections WHERE user_id = ? AND question_id = ? AND for_date = ?",
      [userId, questionId, forDate],
    );
    if (!r) return null;
    return this.mapReflection(r);
  }

  async getReflectionsForCycleRun(
    cycleRunId: EntityId,
  ): Promise<UserReflection[]> {
    const rows = await this.db.getAllAsync<RawReflection>(
      "SELECT id, user_id, question_id, theme_id, cycle_run_id, status, content, numeric_value, skip_reason, for_date, created_at, updated_at FROM user_reflections WHERE cycle_run_id = ? ORDER BY created_at ASC",
      [cycleRunId],
    );
    return rows.map(this.mapReflection);
  }

  async getUserReflectionHistory(
    userId: EntityId,
  ): Promise<(UserReflection & { question: ReflectionQuestion })[]> {
    const rows = await this.db.getAllAsync<
      RawReflection & {
        q_category_id: EntityId;
        q_theme_id: EntityId | null;
        q_prompt: string;
        q_periodicity: "daily" | "weekly" | "monthly" | "ad_hoc";
        q_preferred_time_of_day: string | null;
        q_response_type: "text" | "scale_1_10";
        q_is_default_suggested: number;
        q_order_index: number;
        q_created_at: string;
      }
    >(
      `SELECT r.*, 
              q.category_id AS q_category_id, q.theme_id AS q_theme_id, q.prompt AS q_prompt, 
              q.periodicity AS q_periodicity, q.preferred_time_of_day AS q_preferred_time_of_day, 
              q.response_type AS q_response_type, q.is_default_suggested AS q_is_default_suggested,
              q.order_index AS q_order_index, q.created_at AS q_created_at
       FROM user_reflections r
       INNER JOIN reflection_questions q ON q.id = r.question_id
       WHERE r.user_id = ?
       ORDER BY r.created_at DESC`,
      [userId],
    );

    return rows.map((row) => ({
      ...this.mapReflection(row),
      question: {
        id: row.question_id,
        categoryId: row.q_category_id,
        themeId: row.q_theme_id,
        prompt: row.q_prompt,
        periodicity: row.q_periodicity,
        preferredTimeOfDay: row.q_preferred_time_of_day,
        responseType: row.q_response_type,
        isDefaultSuggested: Boolean(row.q_is_default_suggested),
        orderIndex: row.q_order_index,
        createdAt: row.q_created_at,
      },
    }));
  }

  async getMissedDailyQuestions(
    userId: EntityId,
    todayDate: string,
  ): Promise<
    {
      question: ReflectionQuestion;
      missedDate: string;
      reflection?: UserReflection | null;
    }[]
  > {
    const routines = await this.getDailyRoutineQuestions(userId);
    const missed: {
      question: ReflectionQuestion;
      missedDate: string;
      reflection?: UserReflection | null;
    }[] = [];

    // Check past dates from oldest to newest within the 2-day catch-up window (FIFO: oldest first)
    const today = new Date(todayDate);
    for (let dayOffset = 2; dayOffset >= 1; dayOffset--) {
      const pastDate = new Date(today);
      pastDate.setDate(today.getDate() - dayOffset);
      const dateStr = pastDate.toISOString().split("T")[0];

      for (const q of routines) {
        const answered = await this.getReflectionForQuestionAndDate(
          userId,
          q.id,
          dateStr,
        );
        if (!answered) {
          missed.push({ question: q, missedDate: dateStr, reflection: null });
        } else if (
          answered.createdAt.startsWith(todayDate) ||
          answered.updatedAt.startsWith(todayDate)
        ) {
          // Keep recently answered/edited catch-up reflections visible during today's session
          missed.push({
            question: q,
            missedDate: dateStr,
            reflection: answered,
          });
        }
      }
    }

    return missed;
  }

  private mapQuestion(r: RawQuestion): ReflectionQuestion {
    return {
      id: r.id,
      categoryId: r.category_id,
      themeId: r.theme_id,
      prompt: r.prompt,
      periodicity: r.periodicity,
      preferredTimeOfDay: r.preferred_time_of_day,
      responseType: r.response_type,
      isDefaultSuggested: Boolean(r.is_default_suggested),
      orderIndex: r.order_index,
      createdAt: r.created_at,
    };
  }

  private mapReflection(r: RawReflection): UserReflection {
    return {
      id: r.id,
      userId: r.user_id,
      questionId: r.question_id,
      themeId: r.theme_id,
      cycleRunId: r.cycle_run_id,
      status: r.status,
      content: r.content,
      numericValue: r.numeric_value,
      skipReason: r.skip_reason,
      forDate: r.for_date,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }
}
