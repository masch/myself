import { DateTime } from "@myself/shared";

export const DEFAULT_DISPLAY_DATETIME_OPTIONS: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

/**
 * Formats a DateTime or ISO date string for display in UI components.
 * Returns an empty string if null, undefined or empty string is provided.
 * Falls back to the input string if parsing fails.
 */
export function formatDisplayDateTime(
  dateInput: DateTime | string | null | undefined,
  options: Intl.DateTimeFormatOptions = DEFAULT_DISPLAY_DATETIME_OPTIONS,
  locale?: string,
): string {
  if (!dateInput) return "";

  try {
    const dateTime =
      dateInput instanceof DateTime ? dateInput : DateTime.from(dateInput);
    return dateTime.toDate().toLocaleDateString(locale, options);
  } catch {
    return typeof dateInput === "string" ? dateInput : "";
  }
}
