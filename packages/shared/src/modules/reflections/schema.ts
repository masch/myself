import { check, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import type { EntityId } from "../../primitives/entity-id";
import { users } from "../users/schema";
import {
  COHORT_STATUSES,
  CYCLE_STATUSES,
  PERIODICITIES,
  REFLECTION_STATUSES,
  RESPONSE_TYPES,
  type CohortStatus,
  type CycleStatus,
  type Periodicity,
  type ReflectionStatus,
  type ResponseType,
} from "./types";

export const reflectionCategories = sqliteTable("reflection_categories", {
  id: text("id").$type<EntityId>().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").default(""),
  createdAt: text("created_at").notNull(),
});

export const reflectionThemes = sqliteTable("reflection_themes", {
  id: text("id").$type<EntityId>().primaryKey(),
  categoryId: text("category_id")
    .$type<EntityId>()
    .notNull()
    .references(() => reflectionCategories.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").default(""),
  targetQuestionCount: integer("target_question_count").notNull(),
  catchUpWindowDays: integer("catch_up_window_days").notNull().default(2),
  editWindowDays: integer("edit_window_days").notNull().default(3),
  createdAt: text("created_at").notNull(),
});

export const themeCohorts = sqliteTable("theme_cohorts", {
  id: text("id").$type<EntityId>().primaryKey(),
  themeId: text("theme_id")
    .$type<EntityId>()
    .notNull()
    .references(() => reflectionThemes.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  enrollmentStartDate: text("enrollment_start_date").notNull(),
  enrollmentEndDate: text("enrollment_end_date").notNull(),
  programStartDate: text("program_start_date").notNull(),
  status: text("status", { enum: COHORT_STATUSES })
    .$type<CohortStatus>()
    .notNull()
    .default("upcoming"),
  createdAt: text("created_at").notNull(),
});

export const reflectionQuestions = sqliteTable("reflection_questions", {
  id: text("id").$type<EntityId>().primaryKey(),
  categoryId: text("category_id")
    .$type<EntityId>()
    .notNull()
    .references(() => reflectionCategories.id, { onDelete: "cascade" }),
  themeId: text("theme_id")
    .$type<EntityId>()
    .references(() => reflectionThemes.id, { onDelete: "set null" }),
  prompt: text("prompt").notNull(),
  periodicity: text("periodicity", { enum: PERIODICITIES })
    .$type<Periodicity>()
    .notNull(),
  preferredTimeOfDay: text("preferred_time_of_day"),
  responseType: text("response_type", { enum: RESPONSE_TYPES })
    .$type<ResponseType>()
    .notNull()
    .default("text"),
  isDefaultSuggested: integer("is_default_suggested", { mode: "boolean" })
    .notNull()
    .default(false),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

export const userQuestionPreferences = sqliteTable(
  "user_question_preferences",
  {
    id: text("id").$type<EntityId>().primaryKey(),
    userId: text("user_id")
      .$type<EntityId>()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    questionId: text("question_id")
      .$type<EntityId>()
      .notNull()
      .references(() => reflectionQuestions.id, { onDelete: "cascade" }),
    isEnabled: integer("is_enabled", { mode: "boolean" })
      .notNull()
      .default(true),
    isPinnedShortcut: integer("is_pinned_shortcut", { mode: "boolean" })
      .notNull()
      .default(false),
    updatedAt: text("updated_at").notNull(),
  },
);

export const userThemeProgress = sqliteTable("user_theme_progress", {
  id: text("id").$type<EntityId>().primaryKey(),
  userId: text("user_id")
    .$type<EntityId>()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  themeId: text("theme_id")
    .$type<EntityId>()
    .notNull()
    .references(() => reflectionThemes.id, { onDelete: "cascade" }),
  cohortId: text("cohort_id")
    .$type<EntityId>()
    .notNull()
    .references(() => themeCohorts.id, { onDelete: "cascade" }),
  cycleRunNumber: integer("cycle_run_number").notNull().default(1),
  currentStep: integer("current_step").notNull().default(1),
  answeredCount: integer("answered_count").notNull().default(0),
  skippedCount: integer("skipped_count").notNull().default(0),
  status: text("status", { enum: CYCLE_STATUSES })
    .$type<CycleStatus>()
    .notNull()
    .default("in_progress"),
  startedAt: text("started_at").notNull(),
  completedAt: text("completed_at"),
});

export const userReflections = sqliteTable(
  "user_reflections",
  {
    id: text("id").$type<EntityId>().primaryKey(),
    userId: text("user_id")
      .$type<EntityId>()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    questionId: text("question_id")
      .$type<EntityId>()
      .notNull()
      .references(() => reflectionQuestions.id, { onDelete: "cascade" }),
    themeId: text("theme_id")
      .$type<EntityId>()
      .references(() => reflectionThemes.id, { onDelete: "set null" }),
    cycleRunId: text("cycle_run_id")
      .$type<EntityId>()
      .references(() => userThemeProgress.id, { onDelete: "set null" }),
    status: text("status", { enum: REFLECTION_STATUSES })
      .$type<ReflectionStatus>()
      .notNull()
      .default("answered"),
    content: text("content"),
    numericValue: integer("numeric_value"),
    skipReason: text("skip_reason"),
    forDate: text("for_date").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    check(
      "numeric_value_range",
      sql`${table.numericValue} IS NULL OR (${table.numericValue} >= 1 AND ${table.numericValue} <= 10)`,
    ),
  ],
);

export type ReflectionCategoryRecord = typeof reflectionCategories.$inferSelect;
export type ReflectionThemeRecord = typeof reflectionThemes.$inferSelect;
export type ThemeCohortRecord = typeof themeCohorts.$inferSelect;
export type ReflectionQuestionRecord = typeof reflectionQuestions.$inferSelect;
export type UserQuestionPreferenceRecord =
  typeof userQuestionPreferences.$inferSelect;
export type UserThemeProgressRecord = typeof userThemeProgress.$inferSelect;
export type UserReflectionRecord = typeof userReflections.$inferSelect;
