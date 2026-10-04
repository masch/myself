import { z } from "zod";

/**
 * Strict ISO 8601 / RFC 3339 date-time pattern matching.
 * Accepts YYYY-MM-DD (parsed as UTC midnight), or full date-time with 'T' separator,
 * optional fractional seconds, and mandatory timezone offset ('Z' or '±HH:MM').
 */
const ISO_DATE_REGEX =
  /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:\d{2}))?$/;

/**
 * Validates ISO 8601 syntax and calendar validity (including leap years and month boundaries).
 */
function isValidIsoDateString(val: string): boolean {
  const match = val.match(ISO_DATE_REGEX);
  if (!match) return false;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (month < 1 || month > 12 || day < 1 || day > 31) return false;

  const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [
    31,
    isLeapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ][month - 1];

  if (day > daysInMonth) return false;

  if (
    match[4] !== undefined &&
    match[5] !== undefined &&
    match[6] !== undefined
  ) {
    const hour = parseInt(match[4], 10);
    const min = parseInt(match[5], 10);
    const sec = parseInt(match[6], 10);
    if (hour > 23 || min > 59 || sec > 59) return false;

    if (match[7] && match[7] !== "Z") {
      const offsetBody = match[7].slice(1);
      const parts = offsetBody.split(":");
      const tzHour = parseInt(parts[0], 10);
      const tzMin = parseInt(parts[1], 10);
      if (tzHour > 23 || tzMin > 59) return false;
    }
  }

  return true;
}

/**
 * Immutable Value Object representing a point in time.
 */
export class DateTime {
  private readonly date: Date;

  private constructor(date: Date) {
    this.date = date;
  }

  /**
   * Creates a DateTime instance representing the current moment.
   */
  static now(): DateTime {
    return new DateTime(new Date());
  }

  /**
   * Creates a DateTime instance representing today at local calendar date (midnight UTC).
   */
  static today(now?: DateTime): DateTime {
    const d = (now ?? DateTime.now()).toDate();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return DateTime.from(`${y}-${m}-${day}`);
  }

  /**
   * Creates a DateTime instance from an ISO string or existing DateTime.
   * Throws an error if the value represents an invalid date.
   */
  static from(value: string | DateTime): DateTime {
    if (value instanceof DateTime) {
      return value;
    }

    if (typeof value === "string") {
      if (!isValidIsoDateString(value)) {
        throw new Error(`Invalid date representation: ${value}`);
      }

      return new DateTime(new Date(value));
    }

    throw new Error(`Invalid date representation: ${String(value)}`);
  }

  /**
   * Returns a new DateTime instance offset by the specified number of days (can be negative).
   */
  addDays(days: number): DateTime {
    const nextDate = new Date(this.date.getTime());
    nextDate.setUTCDate(nextDate.getUTCDate() + days);
    return new DateTime(nextDate);
  }

  /**
   * Calculates the difference in full calendar days between this instance and another DateTime.
   * Positive if this instance is later than other, negative if earlier.
   */
  diffInDays(other: DateTime): number {
    const msPerDay = 86_400_000;
    const d1 = Date.UTC(
      this.date.getUTCFullYear(),
      this.date.getUTCMonth(),
      this.date.getUTCDate(),
    );
    const d2 = Date.UTC(
      other.date.getUTCFullYear(),
      other.date.getUTCMonth(),
      other.date.getUTCDate(),
    );
    return Math.round((d1 - d2) / msPerDay);
  }

  /**
   * Returns the ISO date part formatted as "YYYY-MM-DD".
   */
  toISODate(): string {
    return this.date.toISOString().slice(0, 10);
  }

  /**
   * Returns the timestamp formatted as an ISO 8601 string.
   */
  toISOString(): string {
    return this.date.toISOString();
  }

  /**
   * Compares equality with another DateTime instance.
   */
  equals(other: DateTime): boolean {
    if (!(other instanceof DateTime)) {
      return false;
    }
    return this.date.getTime() === other.date.getTime();
  }

  /**
   * Returns the epoch time in milliseconds.
   */
  toMillis(): number {
    return this.date.getTime();
  }

  /**
   * Returns a new DateTime instance with the local wall-clock time set to the specified values.
   */
  withTime(
    hour: number,
    minute: number,
    second = 0,
    millisecond = 0,
  ): DateTime {
    const nextDate = new Date(this.date.getTime());
    nextDate.setHours(hour, minute, second, millisecond);
    return new DateTime(nextDate);
  }

  /**
   * Returns a cloned Date instance representing the underlying moment in time.
   */
  toDate(): Date {
    return new Date(this.date.getTime());
  }

  /**
   * Returns the local wall-clock time formatted as "HH:mm".
   */
  toLocalTimeHHMM(): string {
    const hours = String(this.date.getHours()).padStart(2, "0");
    const minutes = String(this.date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  /**
   * Formats a DateTime or ISO string for display in UI components.
   * Returns an empty string if null, undefined or empty string is provided.
   * Falls back to the input string if parsing fails.
   */
  static toDisplayString(
    value: DateTime | string | null | undefined,
    options: Intl.DateTimeFormatOptions = DEFAULT_DISPLAY_DATETIME_OPTIONS,
    locale?: string,
  ): string {
    if (!value) return "";
    try {
      const dateTime = value instanceof DateTime ? value : DateTime.from(value);
      return dateTime.toDisplayString(options, locale);
    } catch {
      return typeof value === "string" ? value : "";
    }
  }

  /**
   * Formats the DateTime as a human-readable localized string.
   */
  toDisplayString(
    options: Intl.DateTimeFormatOptions = DEFAULT_DISPLAY_DATETIME_OPTIONS,
    locale?: string,
  ): string {
    return this.date.toLocaleDateString(locale, options);
  }

  /**
   * Returns the ISO date representation when converted to string or interpolated.
   */
  toString(): string {
    return this.toISODate();
  }
}

export const DEFAULT_DISPLAY_DATETIME_OPTIONS: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

export const dateTimeSchema = z.custom<DateTime>(
  (val) => val instanceof DateTime,
  "Invalid DateTime instance",
);

export const isoDateToDateTimeSchema = z.union([
  z.custom<DateTime>((val) => val instanceof DateTime),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD")
    .transform((val) => DateTime.from(val)),
]);
