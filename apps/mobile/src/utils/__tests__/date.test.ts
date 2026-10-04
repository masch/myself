import { describe, expect, it } from "bun:test";
import { DateTime } from "@myself/shared";
import { formatDisplayDateTime } from "../date";

describe("formatDisplayDateTime", () => {
  it("returns empty string when input is null, undefined, or empty", () => {
    expect(formatDisplayDateTime(null)).toBe("");
    expect(formatDisplayDateTime(undefined)).toBe("");
    expect(formatDisplayDateTime("")).toBe("");
  });

  it("formats a valid ISO date string correctly", () => {
    const iso = "2026-10-04T15:30:00.000Z";
    const formatted = formatDisplayDateTime(iso, {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
    expect(formatted).toContain("Oct");
    expect(formatted).toContain("4");
    expect(formatted).toContain("2026");
  });

  it("formats a DateTime instance correctly", () => {
    const dt = DateTime.from("2026-05-12T10:00:00.000Z");
    const formatted = formatDisplayDateTime(dt, {
      month: "numeric",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
    expect(formatted).toContain("2026");
    expect(formatted).toContain("5");
    expect(formatted).toContain("12");
  });

  it("falls back to raw string if parsing fails", () => {
    const invalid = "not-a-valid-date";
    expect(formatDisplayDateTime(invalid)).toBe("not-a-valid-date");
  });
});
