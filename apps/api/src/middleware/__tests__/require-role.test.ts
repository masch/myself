import { describe, expect, it } from "bun:test";
import { Hono } from "hono";
import { ErrorCode } from "@myself/shared";
import type { AppEnv } from "../../types";
import { handleApiError } from "../../errors";
import {
  hasRole,
  parseRoles,
  requireRole,
  type SessionRoleResolver,
} from "../require-role";

describe("parseRoles — the comma-separated role convention (S5)", () => {
  it("reads a single role", () => {
    expect(parseRoles("admin")).toEqual(["admin"]);
    expect(parseRoles("user")).toEqual(["user"]);
  });

  it("splits multiple roles", () => {
    expect(parseRoles("user,admin")).toEqual(["user", "admin"]);
  });

  it("trims the space after a comma, which is what the column really holds", () => {
    // The library joins an array of roles with ",", so "admin, user" is a real value.
    expect(parseRoles("admin, user")).toEqual(["admin", "user"]);
    expect(parseRoles("user,  admin,  editor")).toEqual([
      "user",
      "admin",
      "editor",
    ]);
  });

  it("trims surrounding whitespace and drops empty entries", () => {
    expect(parseRoles(" admin ")).toEqual(["admin"]);
    expect(parseRoles(" , ,")).toEqual([]);
  });

  it("treats an empty, blank, null or missing role as no roles", () => {
    expect(parseRoles("")).toEqual([]);
    expect(parseRoles("   ")).toEqual([]);
    expect(parseRoles(null)).toEqual([]);
    expect(parseRoles(undefined)).toEqual([]);
  });

  it("keeps a role the app does not know as an entry it can never match", () => {
    expect(parseRoles("superuser")).toEqual(["superuser"]);
  });
});

describe("hasRole — admin membership (S5)", () => {
  it("accepts the admin role however it is spelled around commas and spaces", () => {
    for (const role of ["admin", "user,admin", "admin, user", " admin "]) {
      expect(`${role} -> ${hasRole(role, "admin")}`).toBe(`${role} -> true`);
    }
  });

  it("rejects NULL, empty, whitespace-only and unknown roles", () => {
    for (const role of [null, undefined, "", "   ", "user", "superuser"]) {
      expect(`${String(role)} -> ${hasRole(role, "admin")}`).toBe(
        `${String(role)} -> false`,
      );
    }
  });

  it("does not accept a role that merely contains the word admin", () => {
    expect(hasRole("administrator", "admin")).toBe(false);
    expect(hasRole("superadmin", "admin")).toBe(false);
    // The comparison is exact, so a differently cased role is not the known role.
    expect(hasRole("Admin", "admin")).toBe(false);
  });
});

describe("requireRole middleware (S5, S6)", () => {
  function appWith(resolveRole: SessionRoleResolver) {
    let nextReached = false;
    let seenHeaders: Headers | undefined;

    const app = new Hono<AppEnv>().onError(handleApiError).post(
      "/curated",
      requireRole("admin", (headers) => {
        seenHeaders = headers;
        return resolveRole(headers);
      }),
      (c) => {
        nextReached = true;
        return c.json({ ok: true }, 201);
      },
    );

    return {
      app,
      nextReached: () => nextReached,
      seenHeaders: () => seenHeaders,
    };
  }

  async function post(
    app: Hono<AppEnv>,
    init: {
      headers?: Record<string, string>;
      body?: unknown;
      path?: string;
    } = {},
  ): Promise<Response> {
    return await app.request(
      new Request(`http://localhost${init.path ?? "/curated"}`, {
        method: "POST",
        headers: { "content-type": "application/json", ...init.headers },
        body: JSON.stringify(init.body ?? {}),
      }),
    );
  }

  it("answers 401 in the project envelope when there is no session", async () => {
    const { app, nextReached } = appWith(async () => null);

    const res = await post(app);

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string; code: string };
    expect(body).toEqual({
      error: "Authentication required",
      code: ErrorCode.UNAUTHORIZED,
    });
    expect(nextReached()).toBe(false);
  });

  it("answers 403 when the session has no role at all", async () => {
    const { app, nextReached } = appWith(async () => ({ role: null }));

    const res = await post(app);

    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string; code: string };
    expect(body).toEqual({
      error: 'The "admin" role is required',
      code: ErrorCode.FORBIDDEN,
    });
    expect(nextReached()).toBe(false);
  });

  it("answers 403 for a non-admin or unknown role", async () => {
    for (const role of ["user", "   ", "superuser", "administrator"]) {
      const { app, nextReached } = appWith(async () => ({ role }));
      const res = await post(app);
      expect(`${role} -> ${res.status}`).toBe(`${role} -> 403`);
      expect(nextReached()).toBe(false);
    }
  });

  it("calls next for the admin role, including the comma-separated forms", async () => {
    for (const role of ["admin", "user,admin", "admin, user", " admin "]) {
      const { app, nextReached } = appWith(async () => ({ role }));
      const res = await post(app);
      expect(`${role} -> ${res.status}`).toBe(`${role} -> 201`);
      expect(nextReached()).toBe(true);
    }
  });

  it("never reads the role from the query, a header or the body", async () => {
    const { app, nextReached } = appWith(async () => ({ role: "user" }));

    const res = await post(app, {
      path: "/curated?role=admin",
      headers: {
        "x-role": "admin",
        "x-admin": "true",
        authorization: "Bearer not-a-real-session",
      },
      body: { role: "admin" },
    });

    expect(res.status).toBe(403);
    expect(nextReached()).toBe(false);
  });

  it("hands the request headers to the resolver, so the session is what decides", async () => {
    const { app, seenHeaders } = appWith(async () => ({ role: "admin" }));

    await post(app, {
      headers: { authorization: "Bearer session-token" },
    });

    expect(seenHeaders()?.get("authorization")).toBe("Bearer session-token");
  });
});
