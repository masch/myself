import { describe, it, expect } from "bun:test";
import {
  DateTime,
  type ReflectionQuestion,
  type UserReflection,
  type EntityId,
} from "@myself/shared";
import {
  getCurrentTimeHHMM,
  getLocalDateString,
  isReflectionLocked,
  isCohortStarted,
  formatDateDDMM,
  formatRelativeMissedDate,
  addDaysToDate,
  getCohortEnrollmentDeadline,
  isCohortEnrollmentOpen,
  getMaxUnlockedStep,
  isCohortStepUnlocked,
  getCohortStepUnlockDate,
} from "../domain/time-lock";

describe("time-lock utility", () => {
  const baseQuestion: ReflectionQuestion = {
    id: "q1" as EntityId,
    categoryId: "c1" as EntityId,
    themeId: null,
    prompt: "¿Cómo evaluás tu día?",
    periodicity: "daily",
    preferredTimeOfDay: "20:00",
    responseType: "scale_1_10",
    isDefaultSuggested: true,
    orderIndex: 0,
    createdAt: new Date().toISOString(),
  };

  it("formats date to YYYY-MM-DD local calendar date correctly", () => {
    const d = new Date(2026, 8, 13); // September 13, 2026 (local)
    expect(getLocalDateString(d)).toBe("2026-09-13");
  });

  it("formats date to HH:mm correctly", () => {
    const fixedDate = new Date("2026-09-13T08:05:00");
    expect(getCurrentTimeHHMM(fixedDate)).toBe("08:05");
  });

  it("locks question when current time is earlier than preferredTimeOfDay", () => {
    const locked = isReflectionLocked(baseQuestion, null, "14:30");
    expect(locked).toBe(true);
  });

  it("unlocks question when current time has reached preferredTimeOfDay", () => {
    const unlocked = isReflectionLocked(baseQuestion, null, "20:00");
    expect(unlocked).toBe(false);
  });

  it("unlocks question when current time is past preferredTimeOfDay", () => {
    const unlocked = isReflectionLocked(baseQuestion, null, "21:15");
    expect(unlocked).toBe(false);
  });

  it("never locks a question without preferredTimeOfDay", () => {
    const questionWithoutTime = { ...baseQuestion, preferredTimeOfDay: null };
    expect(isReflectionLocked(questionWithoutTime, null, "08:00")).toBe(false);
  });

  it("never locks an already answered reflection", () => {
    const answeredRef: UserReflection = {
      id: "r1" as EntityId,
      userId: "u1" as EntityId,
      questionId: "q1" as EntityId,
      themeId: null,
      cycleRunId: null,
      status: "answered",
      numericValue: 8,
      forDate: "2026-09-13",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(isReflectionLocked(baseQuestion, answeredRef, "10:00")).toBe(false);
  });

  it("never locks an already skipped reflection", () => {
    const skippedRef: UserReflection = {
      id: "r2" as EntityId,
      userId: "u1" as EntityId,
      questionId: "q1" as EntityId,
      themeId: null,
      cycleRunId: null,
      status: "skipped",
      skipReason: "Sin tiempo",
      forDate: "2026-09-13",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(isReflectionLocked(baseQuestion, skippedRef, "10:00")).toBe(false);
  });

  it("never locks a missed reflection from a past date within grace window", () => {
    expect(
      isReflectionLocked(
        baseQuestion,
        null,
        "10:00",
        "2026-09-12",
        "2026-09-13",
      ),
    ).toBe(false);
  });

  describe("isCohortStarted", () => {
    const programStart = DateTime.from("2026-09-15");

    it("returns false when current date is before programStartDate", () => {
      expect(isCohortStarted(programStart, DateTime.from("2026-09-13"))).toBe(
        false,
      );
      expect(isCohortStarted(programStart, DateTime.from("2026-09-14"))).toBe(
        false,
      );
    });

    it("returns true when current date equals programStartDate", () => {
      expect(isCohortStarted(programStart, DateTime.from("2026-09-15"))).toBe(
        true,
      );
    });

    it("returns true when current date is after programStartDate", () => {
      expect(isCohortStarted(programStart, DateTime.from("2026-09-16"))).toBe(
        true,
      );
    });
  });

  describe("formatDateDDMM", () => {
    it("formats ISO date string into DD/MM", () => {
      expect(formatDateDDMM("2026-09-15")).toBe("15/09");
      expect(formatDateDDMM("2026-12-01")).toBe("01/12");
    });
  });

  describe("formatRelativeMissedDate", () => {
    it("formats 1 day ago as Ayer", () => {
      expect(formatRelativeMissedDate("2026-09-12", "2026-09-13", 2)).toBe(
        "Ayer",
      );
    });

    it("formats 2 days ago on 2-day catch up window as Anteayer · Vence hoy", () => {
      expect(formatRelativeMissedDate("2026-09-11", "2026-09-13", 2)).toBe(
        "Anteayer · Vence hoy",
      );
    });

    it("formats 2 days ago on 3-day catch up window as Anteayer", () => {
      expect(formatRelativeMissedDate("2026-09-11", "2026-09-13", 3)).toBe(
        "Anteayer",
      );
    });

    it("formats 3 days ago on 3-day catch up window as Hace 3 días · Vence hoy", () => {
      expect(formatRelativeMissedDate("2026-09-10", "2026-09-13", 3)).toBe(
        "Hace 3 días · Vence hoy",
      );
    });

    it("formats 3 days ago on 5-day catch up window as Hace 3 días", () => {
      expect(formatRelativeMissedDate("2026-09-10", "2026-09-13", 5)).toBe(
        "Hace 3 días",
      );
    });

    it("returns Hoy if date is today or future", () => {
      expect(formatRelativeMissedDate("2026-09-13", "2026-09-13", 2)).toBe(
        "Hoy",
      );
    });
  });

  describe("cohort enrollment window and grace period", () => {
    const testCohort = {
      id: "c1" as EntityId,
      themeId: "t1" as EntityId,
      name: "Spring Cohort",
      enrollmentStartDate: DateTime.from("2026-09-01"),
      enrollmentEndDate: DateTime.from("2026-09-30"),
      programStartDate: DateTime.from("2026-09-15"),
      enrollmentGraceDays: 2,
      status: "open_for_enrollment" as const,
      createdAt: "2026-08-25T00:00:00Z",
    };

    it("adds days to date correctly", () => {
      expect(addDaysToDate("2026-09-15", 2)).toBe("2026-09-17");
      expect(addDaysToDate("2026-09-30", 1)).toBe("2026-10-01");
      expect(() => addDaysToDate("invalid-date", 1)).toThrow(
        /Invalid date representation/,
      );
      expect(() => addDaysToDate("2026-02-30", 1)).toThrow(
        /Invalid date representation/,
      );
    });

    it("calculates enrollment deadline considering programStartDate + enrollmentGraceDays", () => {
      // programStartDate (2026-09-15) + 2 days = 2026-09-17, which is < enrollmentEndDate (2026-09-30)
      const deadline = getCohortEnrollmentDeadline(testCohort);
      expect(deadline).toBeInstanceOf(DateTime);
      expect(deadline.toISODate()).toBe("2026-09-17");

      // when enrollmentEndDate is earlier than programStartDate + graceDays
      const shortCohort = {
        ...testCohort,
        enrollmentEndDate: DateTime.from("2026-09-16"),
      };
      expect(getCohortEnrollmentDeadline(shortCohort).toISODate()).toBe(
        "2026-09-16",
      );
    });

    it("permits enrollment before programStartDate", () => {
      expect(
        isCohortEnrollmentOpen(testCohort, DateTime.from("2026-09-10")),
      ).toBe(true);
      expect(
        isCohortEnrollmentOpen(testCohort, DateTime.from("2026-09-15")),
      ).toBe(true);
    });

    it("permits enrollment during grace period after programStartDate", () => {
      expect(
        isCohortEnrollmentOpen(testCohort, DateTime.from("2026-09-16")),
      ).toBe(true);
      expect(
        isCohortEnrollmentOpen(testCohort, DateTime.from("2026-09-17")),
      ).toBe(true);
    });

    it("rejects enrollment after grace period has expired", () => {
      expect(
        isCohortEnrollmentOpen(testCohort, DateTime.from("2026-09-18")),
      ).toBe(false);
      expect(
        isCohortEnrollmentOpen(testCohort, DateTime.from("2026-09-25")),
      ).toBe(false);
    });

    it("rejects enrollment before enrollmentStartDate", () => {
      expect(
        isCohortEnrollmentOpen(testCohort, DateTime.from("2026-08-31")),
      ).toBe(false);
    });

    it("rejects enrollment when cohort status is not open_for_enrollment", () => {
      const closedCohort = { ...testCohort, status: "closed" as const };
      expect(
        isCohortEnrollmentOpen(closedCohort, DateTime.from("2026-09-10")),
      ).toBe(false);
    });
  });

  describe("cohort progressive daily step cadence", () => {
    const programStartDate = DateTime.from("2026-09-15");

    it("getMaxUnlockedStep returns 0 before program starts", () => {
      expect(
        getMaxUnlockedStep(programStartDate, DateTime.from("2026-09-14")),
      ).toBe(0);
    });

    it("getMaxUnlockedStep returns 1 on program start date", () => {
      expect(
        getMaxUnlockedStep(programStartDate, DateTime.from("2026-09-15")),
      ).toBe(1);
    });

    it("getMaxUnlockedStep returns elapsed days + 1 as days progress", () => {
      expect(
        getMaxUnlockedStep(programStartDate, DateTime.from("2026-09-16")),
      ).toBe(2);
      expect(
        getMaxUnlockedStep(programStartDate, DateTime.from("2026-09-17")),
      ).toBe(3);
      expect(
        getMaxUnlockedStep(programStartDate, DateTime.from("2026-09-21")),
      ).toBe(7);
    });

    it("getMaxUnlockedStep clamps to totalSteps when specified", () => {
      expect(
        getMaxUnlockedStep(programStartDate, DateTime.from("2026-09-30"), 7),
      ).toBe(7);
    });

    it("isCohortStepUnlocked permits current or past steps and locks future steps", () => {
      // On day 1 (2026-09-15)
      expect(
        isCohortStepUnlocked(programStartDate, 1, DateTime.from("2026-09-15")),
      ).toBe(true);
      expect(
        isCohortStepUnlocked(programStartDate, 2, DateTime.from("2026-09-15")),
      ).toBe(false);

      // On day 3 (2026-09-17): steps 1, 2, and 3 are unlocked (catch up supported), step 4 is locked
      expect(
        isCohortStepUnlocked(programStartDate, 1, DateTime.from("2026-09-17")),
      ).toBe(true);
      expect(
        isCohortStepUnlocked(programStartDate, 2, DateTime.from("2026-09-17")),
      ).toBe(true);
      expect(
        isCohortStepUnlocked(programStartDate, 3, DateTime.from("2026-09-17")),
      ).toBe(true);
      expect(
        isCohortStepUnlocked(programStartDate, 4, DateTime.from("2026-09-17")),
      ).toBe(false);
    });

    it("getCohortStepUnlockDate calculates the exact date a step unlocks", () => {
      const unlock1 = getCohortStepUnlockDate(programStartDate, 1);
      expect(unlock1).toBeInstanceOf(DateTime);
      expect(unlock1.toISODate()).toBe("2026-09-15");

      const unlock2 = getCohortStepUnlockDate(programStartDate, 2);
      expect(unlock2.toISODate()).toBe("2026-09-16");

      const unlock3 = getCohortStepUnlockDate(programStartDate, 3);
      expect(unlock3.toISODate()).toBe("2026-09-17");

      const unlock7 = getCohortStepUnlockDate(programStartDate, 7);
      expect(unlock7.toISODate()).toBe("2026-09-21");
    });
  });
});
