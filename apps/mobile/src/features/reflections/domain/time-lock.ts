import {
  DateTime,
  type ReflectionQuestion,
  type UserReflection,
} from "@myself/shared";

/**
 * Returns the current local time formatted as "HH:mm".
 */
export function getCurrentTimeHHMM(date: Date = new Date()): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Formats a Date object into a local calendar date string "YYYY-MM-DD".
 */
export function getLocalDateString(date: Date = new Date()): string {
  return DateTime.today(date).toISODate();
}

/**
 * Determines whether a reflection question is locked because its preferred time of day
 * has not yet arrived for today.
 *
 * Rules:
 * - If already answered or skipped, it is NOT locked.
 * - If it has no preferredTimeOfDay, it is NOT locked.
 * - If the reflection is for a past date (missed grace window), it is NOT locked.
 * - For today's reflection: locked if currentTimeStr < question.preferredTimeOfDay.
 */
export function isReflectionLocked(
  question: ReflectionQuestion,
  reflection?: UserReflection | null,
  currentTimeStr: string = getCurrentTimeHHMM(),
  forDate?: DateTime,
  today: DateTime = DateTime.today(),
): boolean {
  if (reflection?.status === "answered" || reflection?.status === "skipped") {
    return false;
  }
  if (!question.preferredTimeOfDay) {
    return false;
  }
  if (forDate && today.diffInDays(forDate) > 0) {
    return false;
  }
  return currentTimeStr < question.preferredTimeOfDay;
}

/**
 * Determines whether a theme cohort has reached or passed its program start date.
 */
export function isCohortStarted(
  programStartDate: DateTime,
  currentDate: DateTime = DateTime.today(),
): boolean {
  return currentDate.diffInDays(programStartDate) >= 0;
}

/**
 * Formats a DateTime into "DD/MM".
 */
export function formatDateDDMM(date: DateTime): string {
  const parts = date.toISODate().split("-");
  const [, month, day] = parts;
  return `${day}/${month}`;
}

/**
 * Formats a missed reflection date relative to today into human-friendly Spanish.
 *
 * Rules:
 * - 1 day ago: "Ayer" (or "Ayer · Vence hoy" if catchUpWindowDays === 1)
 * - 2 days ago: "Anteayer · Vence hoy" (if catchUpWindowDays === 2) or "Anteayer"
 * - N days ago (when N === catchUpWindowDays): `Hace ${N} días · Vence hoy`
 * - N days ago (when N < catchUpWindowDays): `Hace ${N} días`
 */
export function formatRelativeMissedDate(
  missedDate: DateTime,
  today: DateTime = DateTime.today(),
  catchUpWindowDays: number = 2,
): string {
  const diffDays = today.diffInDays(missedDate);

  if (diffDays <= 0) {
    return "Hoy";
  }

  const isLastDay = diffDays >= catchUpWindowDays;

  if (diffDays === 1) {
    return isLastDay ? "Ayer · Vence hoy" : "Ayer";
  }

  if (diffDays === 2) {
    return isLastDay ? "Anteayer · Vence hoy" : "Anteayer";
  }

  return isLastDay
    ? `Hace ${diffDays} días · Vence hoy`
    : `Hace ${diffDays} días`;
}

/**
 * Adds a specified number of calendar days to an ISO date string "YYYY-MM-DD" and returns "YYYY-MM-DD".
 */
export function addDaysToDate(isoDate: string, days: number): string {
  const dt = DateTime.from(isoDate);
  if (dt.toISODate() !== isoDate && dt.toISOString() !== isoDate) {
    throw new Error(`Invalid date representation: ${isoDate}`);
  }
  return dt.addDays(days).toISODate();
}

/**
 * Calculates the final date until which enrollment is permitted for a cohort.
 * This is the minimum between enrollmentEndDate and (programStartDate + enrollmentGraceDays).
 * Returns a DateTime instance.
 */
export function getCohortEnrollmentDeadline(cohort: {
  enrollmentEndDate: DateTime;
  programStartDate: DateTime;
  enrollmentGraceDays?: number;
}): DateTime {
  const graceDays = cohort.enrollmentGraceDays ?? 0;
  const programGraceCutoff = cohort.programStartDate.addDays(graceDays);
  return cohort.enrollmentEndDate.diffInDays(programGraceCutoff) < 0
    ? cohort.enrollmentEndDate
    : programGraceCutoff;
}

/**
 * Determines whether enrollment for a theme cohort is currently open.
 *
 * Rules:
 * - Must have status === "open_for_enrollment".
 * - currentDate must be >= cohort.enrollmentStartDate.
 * - currentDate must be <= getCohortEnrollmentDeadline(cohort).
 */
export function isCohortEnrollmentOpen(
  cohort: {
    status: string;
    enrollmentStartDate: DateTime;
    enrollmentEndDate: DateTime;
    programStartDate: DateTime;
    enrollmentGraceDays?: number;
  },
  currentDate: DateTime = DateTime.today(),
): boolean {
  if (cohort.status !== "open_for_enrollment") {
    return false;
  }
  if (currentDate.diffInDays(cohort.enrollmentStartDate) < 0) {
    return false;
  }
  const deadline = getCohortEnrollmentDeadline(cohort);
  return currentDate.diffInDays(deadline) <= 0;
}

/**
 * Calculates the maximum cohort step unlocked as of currentDate.
 * Day 1 (programStartDate): step 1 unlocked.
 * Each following day unlocks 1 step: maxUnlockedStep = daysElapsed + 1.
 * Before programStartDate: returns 0.
 * If totalSteps is provided, clamps maxUnlockedStep to totalSteps.
 */
export function getMaxUnlockedStep(
  programStartDate: DateTime,
  currentDate: DateTime = DateTime.today(),
  totalSteps?: number,
): number {
  const diff = currentDate.diffInDays(programStartDate);
  if (diff < 0) return 0;
  const step = diff + 1;
  return totalSteps !== undefined ? Math.min(step, totalSteps) : step;
}

/**
 * Determines whether a specific cohort step is unlocked on currentDate.
 * Allows catching up on past unlocked steps, but prevents advancing ahead of schedule.
 */
export function isCohortStepUnlocked(
  programStartDate: DateTime,
  step: number,
  currentDate: DateTime = DateTime.today(),
): boolean {
  return step <= getMaxUnlockedStep(programStartDate, currentDate);
}

/**
 * Calculates the exact calendar date on which a cohort step unlocks.
 * Returns a DateTime instance.
 */
export function getCohortStepUnlockDate(
  programStartDate: DateTime,
  step: number,
): DateTime {
  if (step <= 1) return programStartDate;
  return programStartDate.addDays(step - 1);
}
