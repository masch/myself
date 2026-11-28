import { describe, expect, it } from "bun:test";
import { canCurateContent } from "../curation-access";

/**
 * The app-side mirror of the API's admin gate (S6).
 *
 * Same parsing as the server's `parseRoles`: comma-separated, trimmed, membership.
 */
describe("canCurateContent", () => {
  it("only offers curated writes to an admin session", () => {
    expect(canCurateContent("admin")).toBe(true);
    expect(canCurateContent("user,admin")).toBe(true);
    expect(canCurateContent(" admin ")).toBe(true);
  });

  it("treats a normal, empty or unknown role as no write access", () => {
    expect(canCurateContent("user")).toBe(false);
    expect(canCurateContent("")).toBe(false);
    expect(canCurateContent("   ")).toBe(false);
    expect(canCurateContent(null)).toBe(false);
    expect(canCurateContent(undefined)).toBe(false);
    // Case-sensitive on purpose: the server knows one spelling, and guessing a second
    // would widen the app's idea of an admin beyond the server's.
    expect(canCurateContent("Admin")).toBe(false);
    expect(canCurateContent("superuser")).toBe(false);
  });
});
