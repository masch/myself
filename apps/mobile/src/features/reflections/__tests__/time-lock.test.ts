import { describe, it, expect } from "bun:test";
import {
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
    it("returns false when current date is before programStartDate", () => {
      expect(isCohortStarted("2026-09-15", "2026-09-13")).toBe(false);
      expect(isCohortStarted("2026-09-15", "2026-09-14")).toBe(false);
    });

    it("returns true when current date equals programStartDate", () => {
      expect(isCohortStarted("2026-09-15", "2026-09-15")).toBe(true);
    });

    it("returns true when current date is after programStartDate", () => {
      expect(isCohortStarted("2026-09-15", "2026-09-16")).toBe(true);
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
});
