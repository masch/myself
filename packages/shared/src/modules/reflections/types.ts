import { z } from "zod";
import { entityIdSchema, type EntityId } from "../../primitives/entity-id";

export const PERIODICITIES = ["daily", "weekly", "monthly", "ad_hoc"] as const;
export type Periodicity = (typeof PERIODICITIES)[number];

export const RESPONSE_TYPES = ["text", "scale_1_10"] as const;
export type ResponseType = (typeof RESPONSE_TYPES)[number];

export const COHORT_STATUSES = [
  "upcoming",
  "open_for_enrollment",
  "active",
  "closed",
] as const;
export type CohortStatus = (typeof COHORT_STATUSES)[number];

export const CYCLE_STATUSES = [
  "in_progress",
  "completed",
  "cancelled",
] as const;
export type CycleStatus = (typeof CYCLE_STATUSES)[number];

export const REFLECTION_STATUSES = ["answered", "skipped"] as const;
export type ReflectionStatus = (typeof REFLECTION_STATUSES)[number];

// 1. Category Schema
export const reflectionCategorySchema = z.object({
  id: entityIdSchema,
  slug: z.string().trim().min(1),
  name: z.string().trim().min(1),
  description: z.string().optional().default(""),
  createdAt: z.string(),
});
export type ReflectionCategory = z.infer<typeof reflectionCategorySchema>;

// 2. Theme Schema
export const reflectionThemeSchema = z.object({
  id: entityIdSchema,
  categoryId: entityIdSchema,
  title: z.string().trim().min(1),
  description: z.string().optional().default(""),
  targetQuestionCount: z.number().int().positive(),
  catchUpWindowDays: z.number().int().nonnegative().default(2),
  editWindowDays: z.number().int().nonnegative().default(3),
  createdAt: z.string(),
});
export type ReflectionTheme = z.infer<typeof reflectionThemeSchema>;

// 3. Theme Cohort Schema
export const themeCohortSchema = z.object({
  id: entityIdSchema,
  themeId: entityIdSchema,
  name: z.string().trim().min(1),
  enrollmentStartDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  enrollmentEndDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  programStartDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  status: z.enum(COHORT_STATUSES).default("upcoming"),
  createdAt: z.string(),
});
export type ThemeCohort = z.infer<typeof themeCohortSchema>;

// 4. Question Schema
export const reflectionQuestionSchema = z.object({
  id: entityIdSchema,
  categoryId: entityIdSchema,
  themeId: entityIdSchema.nullable().optional(),
  prompt: z.string().trim().min(1),
  periodicity: z.enum(PERIODICITIES),
  preferredTimeOfDay: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Must be HH:mm")
    .nullable()
    .optional(),
  responseType: z.enum(RESPONSE_TYPES).default("text"),
  isDefaultSuggested: z.boolean().default(false),
  orderIndex: z.number().int().nonnegative().default(0),
  createdAt: z.string(),
});
export type ReflectionQuestion = z.infer<typeof reflectionQuestionSchema>;

// 5. User Question Preference Schema (Opt-out & Shortcuts)
export const userQuestionPreferenceSchema = z.object({
  id: entityIdSchema,
  userId: entityIdSchema,
  questionId: entityIdSchema,
  isEnabled: z.boolean().default(true),
  isPinnedShortcut: z.boolean().default(false),
  updatedAt: z.string(),
});
export type UserQuestionPreference = z.infer<
  typeof userQuestionPreferenceSchema
>;

// 6. User Theme Progress (Cycle run)
export const userThemeProgressSchema = z.object({
  id: entityIdSchema,
  userId: entityIdSchema,
  themeId: entityIdSchema,
  cohortId: entityIdSchema,
  cycleRunNumber: z.number().int().positive().default(1),
  currentStep: z.number().int().positive().default(1),
  answeredCount: z.number().int().nonnegative().default(0),
  skippedCount: z.number().int().nonnegative().default(0),
  status: z.enum(CYCLE_STATUSES).default("in_progress"),
  startedAt: z.string(),
  completedAt: z.string().nullable().optional(),
});
export type UserThemeProgress = z.infer<typeof userThemeProgressSchema>;

// 7. User Reflection (Answer or Skip)
export const userReflectionSchema = z.object({
  id: entityIdSchema,
  userId: entityIdSchema,
  questionId: entityIdSchema,
  themeId: entityIdSchema.nullable().optional(),
  cycleRunId: entityIdSchema.nullable().optional(),
  status: z.enum(REFLECTION_STATUSES).default("answered"),
  content: z.string().nullable().optional(),
  numericValue: z.number().int().min(1).max(10).nullable().optional(),
  skipReason: z.string().nullable().optional(),
  forDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type UserReflection = z.infer<typeof userReflectionSchema>;

// Submission validation schema
export const createReflectionInputSchema = z
  .object({
    userId: entityIdSchema,
    questionId: entityIdSchema,
    themeId: entityIdSchema.nullable().optional(),
    cycleRunId: entityIdSchema.nullable().optional(),
    status: z.enum(REFLECTION_STATUSES),
    responseType: z.enum(RESPONSE_TYPES),
    content: z.string().optional(),
    numericValue: z.number().int().min(1).max(10).optional(),
    skipReason: z.string().optional(),
    forDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  })
  .superRefine((data, ctx) => {
    if (data.status === "skipped") {
      if (!data.skipReason || data.skipReason.trim().length === 0) {
        ctx.addIssue({
          code: "custom",
          message: "Skip reason is required when skipping a question",
          path: ["skipReason"],
        });
      }
    } else if (data.status === "answered") {
      if (data.responseType === "text") {
        if (!data.content || data.content.trim().length === 0) {
          ctx.addIssue({
            code: "custom",
            message: "Reflection content cannot be blank for text responses",
            path: ["content"],
          });
        }
      } else if (data.responseType === "scale_1_10") {
        if (
          typeof data.numericValue !== "number" ||
          data.numericValue < 1 ||
          data.numericValue > 10
        ) {
          ctx.addIssue({
            code: "custom",
            message: "Numeric value must be an integer between 1 and 10",
            path: ["numericValue"],
          });
        }
      }
    }
  });

export type CreateReflectionInput = z.infer<typeof createReflectionInputSchema>;
