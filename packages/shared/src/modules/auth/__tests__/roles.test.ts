import { describe, expect, it } from "bun:test";
import { ADMIN_ROLE, DEFAULT_ROLE, isRole, ROLES } from "../roles";

describe("role catalogue (S5)", () => {
  it("holds every role exactly once", () => {
    // Set equality avoids asserting on a literal-typed length, which the
    // `as const` tuple makes unassignable to `number`.
    expect([...ROLES]).toEqual([...new Set(ROLES)]);
    expect(ROLES).toContain("admin");
    expect(ROLES).toContain("user");
  });

  it("keeps the named roles inside the catalogue", () => {
    expect(ROLES).toContain(ADMIN_ROLE);
    expect(ROLES).toContain(DEFAULT_ROLE);
  });

  it("rejects anything the app would silently fail to honour", () => {
    // A capital letter or a trailing space parses to a role nobody holds, so the
    // request answers 403 with no explanation. The catalogue is what makes that
    // impossible at the write boundary instead of mysterious at the read boundary.
    for (const value of [
      "Admin",
      "ADMIN",
      "admin ",
      " admin",
      "admin,user",
      "admin, user",
      "",
      "owner",
    ]) {
      expect(isRole(value)).toBe(false);
    }
    for (const value of [null, undefined, 1, {}, []]) {
      expect(isRole(value)).toBe(false);
    }
  });

  it("accepts every declared role and nothing more", () => {
    for (const role of ROLES) {
      expect(isRole(role)).toBe(true);
    }
  });
});
