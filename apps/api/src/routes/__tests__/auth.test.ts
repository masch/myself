import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { eq } from "drizzle-orm";
import {
  ADMIN_USER_EMAIL,
  ADMIN_USER_ID,
  DEMO_USER_EMAIL,
  DEMO_USER_ID,
  entityIdSchema,
  session,
  user,
} from "@myself/shared";
import { createApp } from "../../app";
import { AppConfig } from "../../config";
import {
  createDb,
  type DbClient,
} from "../../infrastructure/persistence/client";
import {
  DEMO_USER_PASSWORD,
  seedFromConfig,
} from "../../infrastructure/persistence/seed";

// Throwaway value for the API's own test instance: it only ever guards a database
// created in the system temp directory and deleted when this file finishes.
const AUTH_SECRET = "dGhpcy1pcy1hLXRlc3Qtc2VjcmV0LWZvci1iZXR0ZXItYXV0aA==";

/**
 * The admin credential is deployment configuration (R1-001), so this suite supplies its
 * own value through the app's environment instead of importing one from the seed.
 */
const ADMIN_TEST_PASSWORD = "auth-suite-admin-password";

/**
 * Every test in this file talks to the API over HTTP through the real Hono app,
 * never through `auth.api`, and the database is a throwaway libSQL file created in
 * the system temp directory (never the repository's own database).
 */
function createTempDatabase(): { url: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), "myself-auth-"));
  return {
    url: `file:${join(dir, "auth.db")}`,
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

function jsonRequest(path: string, body: unknown, token?: string): Request {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

/**
 * Signs an identity in through the real HTTP handler and returns the bearer token the
 * native client would store (S8).
 */
async function signIn(
  app: ReturnType<typeof createApp>,
  email: string,
  password: string,
): Promise<string> {
  const res = await app.request(
    jsonRequest("/api/auth/sign-in/email", { email, password }),
  );
  expect(res.status).toBe(200);
  const token = res.headers.get("set-auth-token");
  expect(typeof token).toBe("string");
  return token!;
}

describe("POST /api/auth/* over HTTP (S1)", () => {
  let app: ReturnType<typeof createApp>;
  let db: DbClient;
  let database: ReturnType<typeof createTempDatabase>;

  beforeAll(async () => {
    database = createTempDatabase();
    const config = AppConfig.from({
      ENVIRONMENT: "test",
      TURSO_DATABASE_URL: database.url,
      BETTER_AUTH_SECRET: AUTH_SECRET,
      BETTER_AUTH_URL: "http://localhost:8787",
      ADMIN_USER_PASSWORD: ADMIN_TEST_PASSWORD,
    });
    await seedFromConfig(config);
    db = createDb({ url: database.url });
    app = createApp(config);
  });

  afterAll(() => {
    database.cleanup();
  });

  it("signs up an email + password user with a UUID id the domain entity accepts", async () => {
    const res = await app.request(
      jsonRequest("/api/auth/sign-up/email", {
        email: "ada@example.com",
        password: "correct-horse-battery-staple",
        name: "Ada Lovelace",
      }),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { user: { id: string; email: string } };
    expect(body.user.email).toBe("ada@example.com");

    // The hard requirement behind `advanced.database.generateId` (L14 landmine):
    // Better Auth's default generator returns a 32-character non-UUID id, which the
    // domain `User` rejects.
    expect(body.user.id).not.toMatch(/^[0-9a-zA-Z]{32}$/);
    expect(() => entityIdSchema.parse(body.user.id)).not.toThrow();

    // Direct row assertion: the stored identity is readable and carries the id the
    // request returned, without going through the removed `mapUserRow` (S7).
    const [row] = await db.select().from(user).where(eq(user.id, body.user.id));
    expect(row).toBeDefined();
    expect(row.email).toBe("ada@example.com");
    expect(row.id).toBe(body.user.id);

    // The anonymous users surface is gone (S7): the same path is now a 404.
    const byId = await app.request(`/v1/users/${body.user.id}`);
    expect(byId.status).toBe(404);
  });

  it("resolves the user from the Bearer token returned as set-auth-token", async () => {
    const signUp = await app.request(
      jsonRequest("/api/auth/sign-up/email", {
        email: "grace@example.com",
        password: "another-long-password",
        name: "Grace Hopper",
      }),
    );
    expect(signUp.status).toBe(200);
    const created = (await signUp.json()) as { user: { id: string } };

    const token = signUp.headers.get("set-auth-token");
    expect(typeof token).toBe("string");
    expect(token!.length).toBeGreaterThan(0);

    // The header is `<session token>.<HMAC signature>`, which is how the bearer
    // plugin authenticates a token that travels outside a cookie jar.
    const [rawToken, signature] = token!.split(".");
    expect(rawToken!.length).toBe(32);
    expect(signature!.length).toBeGreaterThan(0);

    const sessionRes = await app.request(
      new Request("http://localhost/api/auth/get-session", {
        headers: { authorization: `Bearer ${token}` },
      }),
    );
    expect(sessionRes.status).toBe(200);
    const sessionBody = (await sessionRes.json()) as {
      user: { id: string; email: string };
      session: { token: string };
    };
    expect(sessionBody.user.id).toBe(created.user.id);
    expect(sessionBody.user.email).toBe("grace@example.com");

    // Observed storage shape: the raw token is stored in `session.token` (the
    // signature is not persisted), and `updated_at` has no database default, so its
    // presence proves Better Auth populates it.
    expect(sessionBody.session.token).toBe(rawToken!);
    const [row] = await db
      .select()
      .from(session)
      .where(eq(session.token, rawToken!));
    expect(row).toBeDefined();
    expect(row.userId).toBe(created.user.id);
    expect(row.updatedAt).toBeInstanceOf(Date);
    expect(row.updatedAt.getTime()).toBeGreaterThan(0);
    expect(row.createdAt).toBeInstanceOf(Date);

    // An unauthenticated call must not resolve a session.
    const anonymous = await app.request("/api/auth/get-session");
    expect(anonymous.status).toBe(200);
    expect(await anonymous.json()).toBeNull();
  });

  it("takes the client IP from cf-connecting-ip, not x-forwarded-for (S14)", async () => {
    const res = await app.request(
      new Request("http://localhost/api/auth/sign-up/email", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          // Workers forward the caller through this header only.
          "cf-connecting-ip": "203.0.113.7",
        },
        body: JSON.stringify({
          email: "ip@example.com",
          password: "a-long-enough-password",
          name: "Ip Address",
        }),
      }),
    );
    expect(res.status).toBe(200);

    const [rawToken] = res.headers.get("set-auth-token")!.split(".");
    const [row] = await db
      .select()
      .from(session)
      .where(eq(session.token, rawToken!));
    expect(row.ipAddress).toBe("203.0.113.7");
  });

  it("rejects a blank profile name at sign-up without storing a row (S3)", async () => {
    const before = await db.select().from(user);

    const res = await app.request(
      jsonRequest("/api/auth/sign-up/email", {
        email: "blank-name@example.com",
        password: "a-long-enough-password",
        name: "   ",
      }),
    );

    // Better Auth only type-checks `name`, so without the database hook this row
    // would be stored and every later read through the domain `User` would throw.
    expect(res.status).toBe(400);
    const body = (await res.json()) as { message?: string };
    expect(JSON.stringify(body)).toContain("User name is required");

    const after = await db.select().from(user);
    expect(after.length).toBe(before.length);
    expect(after.some((row) => row.email === "blank-name@example.com")).toBe(
      false,
    );
  });

  it("rejects a blank profile name on update-user and keeps the stored row (S3)", async () => {
    const signUp = await app.request(
      jsonRequest("/api/auth/sign-up/email", {
        email: "grace.update@example.com",
        password: "another-long-password",
        name: "Grace Hopper",
      }),
    );
    expect(signUp.status).toBe(200);
    const token = signUp.headers.get("set-auth-token")!;
    const created = (await signUp.json()) as { user: { id: string } };

    const rejected = await app.request(
      jsonRequest("/api/auth/update-user", { name: "   " }, token),
    );
    expect(rejected.status).toBe(400);
    expect(
      JSON.stringify((await rejected.json()) as Record<string, unknown>),
    ).toContain("User name is required");

    const [unchanged] = await db
      .select()
      .from(user)
      .where(eq(user.id, created.user.id));
    expect(unchanged.name).toBe("Grace Hopper");

    // A valid name still goes through the same endpoint.
    const accepted = await app.request(
      jsonRequest("/api/auth/update-user", { name: "Grace B. Hopper" }, token),
    );
    expect(accepted.status).toBe(200);
    const [updated] = await db
      .select()
      .from(user)
      .where(eq(user.id, created.user.id));
    expect(updated.name).toBe("Grace B. Hopper");
  });

  it("rejects an explicit null name on update-user without storing it (R3-002)", async () => {
    const signUp = await app.request(
      jsonRequest("/api/auth/sign-up/email", {
        email: "ada.null@example.com",
        password: "another-long-password",
        name: "Ada Null",
      }),
    );
    expect(signUp.status).toBe(200);
    const token = signUp.headers.get("set-auth-token")!;
    const created = (await signUp.json()) as { user: { id: string } };

    // `name: null` used to be skipped exactly like `undefined`, so the write reached
    // the `NOT NULL` column and failed as an uncontrolled 500 (observed: SQLITE
    // constraint on `user.name`) instead of the 400 the hook exists to produce.
    const rejected = await app.request(
      jsonRequest("/api/auth/update-user", { name: null }, token),
    );
    expect(rejected.status).toBe(400);
    expect(
      JSON.stringify((await rejected.json()) as Record<string, unknown>),
    ).toContain("Invalid user name");

    const [unchanged] = await db
      .select()
      .from(user)
      .where(eq(user.id, created.user.id));
    expect(unchanged.name).toBe("Ada Null");
    // The stored row must still carry a valid domain id and a readable name.
    expect(() => entityIdSchema.parse(unchanged.id)).not.toThrow();
    expect(unchanged.name.trim().length).toBeGreaterThan(0);
  });

  it("rejects explicit nulls for both identity fields on update-user (R3-002)", async () => {
    const signUp = await app.request(
      jsonRequest("/api/auth/sign-up/email", {
        email: "both.null@example.com",
        password: "another-long-password",
        name: "Both Null",
      }),
    );
    expect(signUp.status).toBe(200);
    const token = signUp.headers.get("set-auth-token")!;
    const created = (await signUp.json()) as { user: { id: string } };

    const rejected = await app.request(
      jsonRequest("/api/auth/update-user", { name: null, email: null }, token),
    );
    expect(rejected.status).toBe(400);

    const [unchanged] = await db
      .select()
      .from(user)
      .where(eq(user.id, created.user.id));
    expect(unchanged.name).toBe("Both Null");
    expect(unchanged.email).toBe("both.null@example.com");
    expect(() => entityIdSchema.parse(unchanged.id)).not.toThrow();
    expect(unchanged.email.trim().length).toBeGreaterThan(0);
  });

  it("keeps the seeded demo identity working through the real sign-in path", async () => {
    const res = await app.request(
      jsonRequest("/api/auth/sign-in/email", {
        email: DEMO_USER_EMAIL,
        password: DEMO_USER_PASSWORD,
      }),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { user: { id: string; email: string } };
    expect(body.user.id).toBe(DEMO_USER_ID);
    expect(body.user.email).toBe(DEMO_USER_EMAIL);
  });

  it("rejects a wrong password without creating a session", async () => {
    const before = await db.select().from(session);

    const res = await app.request(
      jsonRequest("/api/auth/sign-in/email", {
        email: DEMO_USER_EMAIL,
        password: "definitely-the-wrong-password",
      }),
    );

    expect(res.status).toBe(401);
    const after = await db.select().from(session);
    expect(after.length).toBe(before.length);
  });

  it("mounts the handler outside /v1 and outside the OpenAPI document", async () => {
    const unmounted = await app.request(
      jsonRequest("/v1/auth/sign-up/email", {
        email: "nested@example.com",
        password: "a-long-enough-password",
        name: "Nested",
      }),
    );
    expect(unmounted.status).toBe(404);

    const doc = await app.request("/doc");
    expect(doc.status).toBe(200);
    const spec = (await doc.json()) as { paths: Record<string, unknown> };
    expect(
      Object.keys(spec.paths).some((path) => path.startsWith("/api/auth")),
    ).toBe(false);
  });

  it("signs the seeded admin in and reports the admin role (S20)", async () => {
    const res = await app.request(
      jsonRequest("/api/auth/sign-in/email", {
        email: ADMIN_USER_EMAIL,
        password: ADMIN_TEST_PASSWORD,
      }),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { user: { id: string; role?: string } };
    expect(body.user.id).toBe(ADMIN_USER_ID);
    expect(body.user.role).toBe("admin");

    const sessionRes = await app.request(
      new Request("http://localhost/api/auth/get-session", {
        headers: {
          authorization: `Bearer ${res.headers.get("set-auth-token")}`,
        },
      }),
    );
    expect(sessionRes.status).toBe(200);
    const sessionBody = (await sessionRes.json()) as {
      user: { id: string; role?: string };
    };
    expect(sessionBody.user.id).toBe(ADMIN_USER_ID);
    expect(sessionBody.user.role).toBe("admin");
  });

  it("disables the admin-plugin endpoints this app does not use (S5, S7, S20)", async () => {
    const token = await signIn(app, ADMIN_USER_EMAIL, ADMIN_TEST_PASSWORD);

    // Every one of these is a mutating identity surface this single-role app has no
    // feature for; disabling them is what keeps "no endpoint grants the admin role"
    // (S20) true even for an admin caller.
    const disabledPaths = [
      "/admin/impersonate-user",
      "/admin/stop-impersonating",
      "/admin/set-role",
      "/admin/create-user",
      "/admin/update-user",
      "/admin/remove-user",
      "/admin/set-user-password",
      "/admin/ban-user",
      "/admin/unban-user",
      "/admin/list-user-sessions",
      "/admin/revoke-user-session",
      "/admin/revoke-user-sessions",
      "/admin/has-permission",
    ];

    for (const path of disabledPaths) {
      const res = await app.request(
        new Request(`http://localhost/api/auth${path}`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${token}`,
          },
          body: "{}",
        }),
      );
      expect(`${path} -> ${res.status}`).toBe(`${path} -> 404`);
    }
  });

  it("keeps the admin-only user listing that replaces /v1/users (S7)", async () => {
    const token = await signIn(app, ADMIN_USER_EMAIL, ADMIN_TEST_PASSWORD);

    const listRes = await app.request(
      new Request("http://localhost/api/auth/admin/list-users", {
        headers: { authorization: `Bearer ${token}` },
      }),
    );
    expect(listRes.status).toBe(200);
    const listBody = (await listRes.json()) as {
      users: Array<{ id: string; role?: string }>;
    };
    expect(listBody.users.map((entry) => entry.id)).toContain(DEMO_USER_ID);

    const getRes = await app.request(
      new Request(
        `http://localhost/api/auth/admin/get-user?id=${DEMO_USER_ID}`,
        { headers: { authorization: `Bearer ${token}` } },
      ),
    );
    expect(getRes.status).toBe(200);
  });

  it("refuses the kept admin endpoints without an admin session", async () => {
    const anonymous = await app.request(
      new Request("http://localhost/api/auth/admin/list-users"),
    );
    expect(anonymous.status).toBe(401);

    const signUp = await app.request(
      jsonRequest("/api/auth/sign-up/email", {
        email: "plain.reader@example.com",
        password: "a-long-enough-password",
        name: "Plain Reader",
      }),
    );
    expect(signUp.status).toBe(200);
    const token = signUp.headers.get("set-auth-token")!;

    const asUser = await app.request(
      new Request("http://localhost/api/auth/admin/list-users", {
        headers: { authorization: `Bearer ${token}` },
      }),
    );
    expect(asUser.status).toBe(403);
  });
});
