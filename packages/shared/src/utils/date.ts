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

    const date =
      value instanceof Date ? new Date(value.getTime()) : new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new Error(`Invalid date representation: ${String(value)}`);
    }

    return new DateTime(date);
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
