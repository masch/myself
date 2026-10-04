import { describe, expect, it } from "bun:test";
import {
  createReflectionInputSchema,
  reflectionCategorySchema,
  reflectionQuestionSchema,
  reflectionThemeSchema,
  themeCohortSchema,
  userQuestionPreferenceSchema,
  userThemeProgressSchema,
  userReflectionItemSchema,
  createSeedThemeCohorts,
  getTodayDateString,
} from "../reflections";
import { generateEntityId, DateTime, type EntityId } from "../../primitives";

describe("Reflections Module - Zod Validation Schemas", () => {
  const sampleId = generateEntityId();
  const userId = generateEntityId();
  const questionId = generateEntityId();
  const themeId = generateEntityId();
  const cohortId = generateEntityId();

  it("should validate a valid ReflectionCategory", () => {
    const valid = reflectionCategorySchema.parse({
      id: sampleId,
      slug: "stoicism",
      name: "Stoicism",
      description: "Stoic practices",
      createdAt: "2026-09-12T00:00:00.000Z",
    });
    expect(valid.slug).toBe("stoicism");
    expect(valid.name).toBe("Stoicism");
  });

  it("should validate ReflectionTheme with default windows", () => {
    const theme = reflectionThemeSchema.parse({
      id: themeId,
      categoryId: sampleId,
      title: "7 Days of Resilience",
      targetQuestionCount: 7,
      createdAt: "2026-09-12T00:00:00.000Z",
    });
    expect(theme.targetQuestionCount).toBe(7);
    expect(theme.catchUpWindowDays).toBe(2);
    expect(theme.editWindowDays).toBe(3);
  });

  it("should validate ThemeCohort with valid YYYY-MM-DD dates", () => {
    const cohort = themeCohortSchema.parse({
      id: cohortId,
      themeId,
      name: "October 2026 Cohort",
      enrollmentStartDate: "2026-09-20",
      enrollmentEndDate: "2026-09-30",
      programStartDate: "2026-10-01",
      enrollmentGraceDays: 0,
      status: "open_for_enrollment",
      createdAt: "2026-09-12T00:00:00.000Z",
    });
    expect(cohort.status).toBe("open_for_enrollment");
    expect(cohort.enrollmentGraceDays).toBe(0);
    expect(cohort.enrollmentStartDate).toBeInstanceOf(DateTime);
    expect(cohort.enrollmentEndDate).toBeInstanceOf(DateTime);
    expect(cohort.programStartDate).toBeInstanceOf(DateTime);
    expect(cohort.programStartDate.toISODate()).toBe("2026-10-01");
  });

  it("should reject ThemeCohort when enrollmentGraceDays is omitted", () => {
    expect(() =>
      themeCohortSchema.parse({
        id: cohortId,
        themeId,
        name: "Missing Grace Days Cohort",
        enrollmentStartDate: "2026-09-20",
        enrollmentEndDate: "2026-09-30",
        programStartDate: "2026-10-01",
        createdAt: "2026-09-12T00:00:00.000Z",
      }),
    ).toThrow();
  });

  it("should validate ThemeCohort with custom enrollmentGraceDays", () => {
    const cohort = themeCohortSchema.parse({
      id: cohortId,
      themeId,
      name: "Late Enrollment Cohort",
      enrollmentStartDate: "2026-09-20",
      enrollmentEndDate: "2026-09-30",
      programStartDate: "2026-10-01",
      enrollmentGraceDays: 3,
      status: "open_for_enrollment",
      createdAt: "2026-09-12T00:00:00.000Z",
    });
    expect(cohort.enrollmentGraceDays).toBe(3);
  });

  it("should reject ThemeCohort with negative enrollmentGraceDays", () => {
    expect(() =>
      themeCohortSchema.parse({
        id: cohortId,
        themeId,
        name: "Negative Grace Cohort",
        enrollmentStartDate: "2026-09-20",
        enrollmentEndDate: "2026-09-30",
        programStartDate: "2026-10-01",
        enrollmentGraceDays: -1,
        createdAt: "2026-09-12T00:00:00.000Z",
      }),
    ).toThrow();
  });

  it("should reject ThemeCohort with invalid date formats", () => {
    expect(() =>
      themeCohortSchema.parse({
        id: cohortId,
        themeId,
        name: "Invalid Date Cohort",
        enrollmentStartDate: "20-09-2026",
        enrollmentEndDate: "2026-09-30",
        programStartDate: "2026-10-01",
        createdAt: "2026-09-12T00:00:00.000Z",
      }),
    ).toThrow();
  });

  it("should validate ReflectionQuestion with text and scale_1_10 response types", () => {
    const textQ = reflectionQuestionSchema.parse({
      id: questionId,
      categoryId: sampleId,
      prompt: "What are you grateful for today?",
      periodicity: "daily",
      responseType: "text",
      createdAt: "2026-09-12T00:00:00.000Z",
    });
    expect(textQ.responseType).toBe("text");

    const scaleQ = reflectionQuestionSchema.parse({
      id: questionId,
      categoryId: sampleId,
      prompt: "Rate your focus today from 1 to 10",
      periodicity: "daily",
      preferredTimeOfDay: "08:30",
      responseType: "scale_1_10",
      createdAt: "2026-09-12T00:00:00.000Z",
    });
    expect(scaleQ.responseType).toBe("scale_1_10");
    expect(scaleQ.preferredTimeOfDay).toBe("08:30");

    // Rejects non-zero padded or invalid times (e.g. "8:00", "25:00", "08:60")
    expect(() =>
      reflectionQuestionSchema.parse({
        id: questionId,
        categoryId: sampleId,
        prompt: "Invalid time format",
        periodicity: "daily",
        preferredTimeOfDay: "8:00",
        createdAt: "2026-09-12T00:00:00.000Z",
      }),
    ).toThrow("Must be HH:mm");

    // Item list question with config
    const listQ = reflectionQuestionSchema.parse({
      id: questionId,
      categoryId: sampleId,
      prompt: "What 3 things are you grateful for today?",
      periodicity: "daily",
      preferredTimeOfDay: "20:00",
      responseType: "item_list",
      config: { minItems: 3, maxItems: 5 },
      createdAt: "2026-09-12T00:00:00.000Z",
    });
    expect(listQ.responseType).toBe("item_list");
    expect(listQ.config?.minItems).toBe(3);
    expect(listQ.config?.maxItems).toBe(5);

    // Item list question with unlimited maxItems
    const unlimitedQ = reflectionQuestionSchema.parse({
      id: questionId,
      categoryId: sampleId,
      prompt: "Open gratitude list",
      periodicity: "daily",
      preferredTimeOfDay: "20:00",
      responseType: "item_list",
      config: { minItems: 3, maxItems: "unlimited" },
      createdAt: "2026-09-12T00:00:00.000Z",
    });
    expect(unlimitedQ.config?.maxItems).toBe("unlimited");

    // Rejects maxItems < minItems
    expect(() =>
      reflectionQuestionSchema.parse({
        id: questionId,
        categoryId: sampleId,
        prompt: "Invalid range",
        periodicity: "daily",
        responseType: "item_list",
        config: { minItems: 5, maxItems: 2 },
        createdAt: "2026-09-12T00:00:00.000Z",
      }),
    ).toThrow();
  });

  it("should validate UserReflectionItem schema", () => {
    const item = userReflectionItemSchema.parse({
      id: sampleId,
      reflectionId: sampleId,
      orderIndex: 1,
      content: "Morning coffee in the sunshine",
      createdAt: "2026-09-12T20:15:00.000Z",
      updatedAt: "2026-09-12T20:15:00.000Z",
    });
    expect(item.orderIndex).toBe(1);
    expect(item.content).toBe("Morning coffee in the sunshine");

    expect(() =>
      userReflectionItemSchema.parse({
        id: sampleId,
        reflectionId: sampleId,
        orderIndex: 1,
        content: "   ",
        createdAt: "2026-09-12T20:15:00.000Z",
        updatedAt: "2026-09-12T20:15:00.000Z",
      }),
    ).toThrow();
  });

  it("should validate UserQuestionPreference for routine opt-out and shortcuts", () => {
    const pref = userQuestionPreferenceSchema.parse({
      id: sampleId,
      userId,
      questionId,
      isEnabled: false,
      isPinnedShortcut: true,
      updatedAt: "2026-09-12T00:00:00.000Z",
    });
    expect(pref.isEnabled).toBe(false);
    expect(pref.isPinnedShortcut).toBe(true);
  });

  it("should validate UserThemeProgress cycle progression", () => {
    const progress = userThemeProgressSchema.parse({
      id: sampleId,
      userId,
      themeId,
      cohortId,
      cycleRunNumber: 2,
      currentStep: 3,
      answeredCount: 2,
      skippedCount: 1,
      status: "in_progress",
      startedAt: "2026-10-01T08:00:00.000Z",
    });
    expect(progress.cycleRunNumber).toBe(2);
    expect(progress.currentStep).toBe(3);
  });

  it("should validate createReflectionInputSchema for text, scale, and skip", () => {
    // 1. Valid text answer
    const textAnswer = createReflectionInputSchema.parse({
      userId,
      questionId,
      status: "answered",
      responseType: "text",
      content: "I meditated for 15 minutes today.",
      forDate: "2026-09-12",
    });
    expect(textAnswer.content).toBe("I meditated for 15 minutes today.");

    // 2. Reject blank text answer
    expect(() =>
      createReflectionInputSchema.parse({
        userId,
        questionId,
        status: "answered",
        responseType: "text",
        content: "   ",
        forDate: "2026-09-12",
      }),
    ).toThrow();

    // 3. Valid scale answer
    const scaleAnswer = createReflectionInputSchema.parse({
      userId,
      questionId,
      status: "answered",
      responseType: "scale_1_10",
      numericValue: 9,
      forDate: "2026-09-12",
    });
    expect(scaleAnswer.numericValue).toBe(9);

    // 4. Reject invalid scale scores
    expect(() =>
      createReflectionInputSchema.parse({
        userId,
        questionId,
        status: "answered",
        responseType: "scale_1_10",
        numericValue: 11,
        forDate: "2026-09-12",
      }),
    ).toThrow();

    expect(() =>
      createReflectionInputSchema.parse({
        userId,
        questionId,
        status: "answered",
        responseType: "scale_1_10",
        numericValue: 0,
        forDate: "2026-09-12",
      }),
    ).toThrow();

    // 5. Valid skip with reason
    const skipValid = createReflectionInputSchema.parse({
      userId,
      questionId,
      status: "skipped",
      responseType: "text",
      skipReason: "Did not apply today",
      forDate: "2026-09-12",
    });
    expect(skipValid.skipReason).toBe("Did not apply today");

    // 6. Reject skip without reason
    expect(() =>
      createReflectionInputSchema.parse({
        userId,
        questionId,
        status: "skipped",
        responseType: "text",
        skipReason: "",
        forDate: "2026-09-12",
      }),
    ).toThrow();

    // 7. Valid item_list answer
    const listAnswer = createReflectionInputSchema.parse({
      userId,
      questionId,
      status: "answered",
      responseType: "item_list",
      items: [{ content: "Morning coffee" }, { content: "Productive meeting" }],
      forDate: "2026-09-12",
    });
    expect(listAnswer.items?.length).toBe(2);

    // 8. Reject item_list with empty items array
    expect(() =>
      createReflectionInputSchema.parse({
        userId,
        questionId,
        status: "answered",
        responseType: "item_list",
        items: [],
        forDate: "2026-09-12",
      }),
    ).toThrow();

    // 9. Reject item_list with blank item content
    expect(() =>
      createReflectionInputSchema.parse({
        userId,
        questionId,
        status: "answered",
        responseType: "item_list",
        items: [{ content: "   " }],
        forDate: "2026-09-12",
      }),
    ).toThrow();
  });

  describe("Dynamic Seed Theme Cohorts", () => {
    it("generates cohort starting on provided base date", () => {
      const cohorts = createSeedThemeCohorts("2026-09-30");
      expect(cohorts.length).toBe(2);
      // Historical cohort
      expect(cohorts[0].id).toBe(
        "a1000000-0000-4000-8000-000000000001" as EntityId,
      );
      expect(cohorts[0].programStartDate).toBe("2026-09-15");

      // Dynamic cohort
      expect(cohorts[1].id).toBe(
        "a1000000-0000-4000-8000-000000000002" as EntityId,
      );
      expect(cohorts[1].programStartDate).toBe("2026-09-30");
      expect(cohorts[1].enrollmentStartDate).toBe("2026-09-23");
      expect(cohorts[1].enrollmentEndDate).toBe("2026-10-30");
      expect(cohorts[1].enrollmentGraceDays).toBe(2);
      expect(cohorts[1].status).toBe("open_for_enrollment");
    });

    it("generates dynamic cohort starting today when base date is omitted", () => {
      const todayStr = getTodayDateString();
      const cohorts = createSeedThemeCohorts();
      expect(cohorts.length).toBe(2);
      expect(cohorts[1].programStartDate).toBe(todayStr);

      const fixedDateTime = DateTime.from("2026-05-10T12:00:00.000Z");
      expect(getTodayDateString(fixedDateTime)).toBe(
        DateTime.today(fixedDateTime).toISODate(),
      );
    });
  });
});
