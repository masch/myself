/**
 * Strict ISO 8601 / RFC 3339 date-time pattern matching.
 * Accepts YYYY-MM-DD (parsed as UTC midnight), or full date-time with 'T' separator,
 * optional fractional seconds, and mandatory timezone offset ('Z' or '±HH:MM').
 */
const ISO_DATE_REGEX =
  /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:\d{2}))?$/;

/**
 * Validates ISO 8601 syntax and calendar validity (including leap years and month boundaries).
 *
 * Rationale for explicit validation overhead:
 * 1. Timezone Determinism & RFC 3339: In ECMAScript, date-time strings without timezone offsets
 *    (or space-separated) are parsed as local time by the host engine, producing different UTC
 *    timestamps across distributed clients and servers. Date-only strings (YYYY-MM-DD) are
 *    consistently parsed as UTC midnight. Datetimes therefore require 'T' and an explicit 'Z' or offset.
 * 2. Cross-Platform Engine Parity: This package is universal and runs in V8 (Cloudflare Workers, Bun)
 *    and Hermes / JSC (React Native mobile). Non-ISO string parsing via `new Date(string)` is
 *    implementation-dependent across engines. Hermes rejects or misinterprets non-ISO formats that V8 tolerates.
 * 3. Silent Date Rollover: Native `new Date("YYYY-MM-DD")` in many engines silently rolls over invalid calendar
 *    days (e.g. "2026-02-30" rolls over to March 2). Validating days in month prevents subtle data corruption.
 * 4. Contract Guarantee: Ensures any date string ingested produces deterministic timestamps and identical
 *    behavior across API and mobile clients without runtime surprises.
 */
function isValidIsoDateString(val: string): boolean {
  const match = val.match(ISO_DATE_REGEX);
  if (!match) return false;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (month < 1 || month > 12 || day < 1 || day > 31) return false;

  const isLeapYear =
    year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
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
   * Creates a DateTime instance from an ISO string, Date, or existing DateTime.
   * Throws an error if the value represents an invalid date.
   */
  static from(value: string | Date | DateTime): DateTime {
    if (value instanceof DateTime) {
      return value;
    }

    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) {
        throw new Error(`Invalid date representation: ${String(value)}`);
      }
      return new DateTime(new Date(value.getTime()));
    }

    if (typeof value === "string") {
      if (!isValidIsoDateString(value)) {
        throw new Error(`Invalid date representation: ${value}`);
      }

      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        throw new Error(`Invalid date representation: ${value}`);
      }

      return new DateTime(date);
    }

    throw new Error(`Invalid date representation: ${String(value)}`);
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
}
