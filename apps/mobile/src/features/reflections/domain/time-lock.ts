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
  forDate?: string,
  todayStr: string = getLocalDateString(),
): boolean {
  if (reflection?.status === "answered" || reflection?.status === "skipped") {
    return false;
  }
  if (!question.preferredTimeOfDay) {
    return false;
  }
  if (forDate && forDate < todayStr) {
    return false;
  }
  return currentTimeStr < question.preferredTimeOfDay;
}

/**
 * Determines whether a theme cohort has reached or passed its program start date.
 */
export function isCohortStarted(
  programStartDate: string,
  currentDateStr: string = getLocalDateString(),
): boolean {
  return currentDateStr >= programStartDate;
}

/**
 * Formats an ISO date string "YYYY-MM-DD" into "DD/MM".
 */
export function formatDateDDMM(isoDate: string): string {
  const parts = isoDate.split("-");
  if (parts.length < 3) return isoDate;
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
  missedDate: string,
  todayStr: string = getLocalDateString(),
  catchUpWindowDays: number = 2,
): string {
  const missedTime = new Date(`${missedDate}T00:00:00Z`).getTime();
  const todayTime = new Date(`${todayStr}T00:00:00Z`).getTime();
  const diffDays = Math.round((todayTime - missedTime) / (1000 * 60 * 60 * 24));

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
  return DateTime.from(isoDate).addDays(days).toISODate();
}

/**
 * Calculates the final date until which enrollment is permitted for a cohort.
 * This is the minimum between enrollmentEndDate and (programStartDate + enrollmentGraceDays).
 */
export function getCohortEnrollmentDeadline(cohort: {
  enrollmentEndDate: string;
  programStartDate: string;
  enrollmentGraceDays?: number;
}): string {
  const graceDays = cohort.enrollmentGraceDays ?? 0;
  const programGraceCutoff = addDaysToDate(cohort.programStartDate, graceDays);
  return cohort.enrollmentEndDate < programGraceCutoff
    ? cohort.enrollmentEndDate
    : programGraceCutoff;
}

/**
 * Determines whether enrollment for a theme cohort is currently open.
 *
 * Rules:
 * - Must have status === "open_for_enrollment".
 * - currentDateStr must be >= cohort.enrollmentStartDate.
 * - currentDateStr must be <= getCohortEnrollmentDeadline(cohort).
 */
export function isCohortEnrollmentOpen(
  cohort: {
    status: string;
    enrollmentStartDate: string;
    enrollmentEndDate: string;
    programStartDate: string;
    enrollmentGraceDays?: number;
  },
  currentDateStr: string = getLocalDateString(),
): boolean {
  if (cohort.status !== "open_for_enrollment") {
    return false;
  }
  if (currentDateStr < cohort.enrollmentStartDate) {
    return false;
  }
  const deadline = getCohortEnrollmentDeadline(cohort);
  return currentDateStr <= deadline;
}

/**
 * Calculates the maximum cohort step unlocked as of currentDateStr.
 * Day 1 (programStartDate): step 1 unlocked.
 * Each following day unlocks 1 step: maxUnlockedStep = daysElapsed + 1.
 * Before programStartDate: returns 0.
 * If totalSteps is provided, clamps maxUnlockedStep to totalSteps.
 */
export function getMaxUnlockedStep(
  programStartDate: string,
  currentDateStr: string = getLocalDateString(),
  totalSteps?: number,
): number {
  const startDt = DateTime.from(programStartDate);
  const currentDt = DateTime.from(currentDateStr);
  const diff = currentDt.diffInDays(startDt);
  if (diff < 0) return 0;
  const step = diff + 1;
  return totalSteps !== undefined ? Math.min(step, totalSteps) : step;
}

/**
 * Determines whether a specific cohort step is unlocked on currentDateStr.
 * Allows catching up on past unlocked steps, but prevents advancing ahead of schedule.
 */
export function isCohortStepUnlocked(
  programStartDate: string,
  step: number,
  currentDateStr: string = getLocalDateString(),
): boolean {
  return step <= getMaxUnlockedStep(programStartDate, currentDateStr);
}

/**
 * Calculates the exact calendar date (YYYY-MM-DD) on which a cohort step unlocks.
 */
export function getCohortStepUnlockDate(
  programStartDate: string,
  step: number,
): string {
  if (step <= 1) return programStartDate;
  return DateTime.from(programStartDate)
    .addDays(step - 1)
    .toISODate();
}
