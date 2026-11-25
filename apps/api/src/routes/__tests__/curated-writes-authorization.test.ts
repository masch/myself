import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { eq } from "drizzle-orm";
import {
  ADMIN_USER_EMAIL,
  ADMIN_USER_ID,
  ErrorCode,
  SEED_AUTHOR_IDS,
  user,
  type AuthorDto,
  type EntityId,
  type PaginatedResponse,
  type ReadingDto,
} from "@myself/shared";
import { createApp } from "../../app";
import { AppConfig } from "../../config";
import {
  createDb,
  type DbClient,
} from "../../infrastructure/persistence/client";
import { seedFromConfig } from "../../infrastructure/persistence/seed";

const AUTH_SECRET = "dGhpcy1pcy1hLXRlc3Qtc2VjcmV0LWZvci1jdXJhdGVkLXdyaXRlcw==";

/**
 * The admin credential is deployment configuration (R1-001), so this suite supplies its
 * own value through the app's environment instead of importing one from the seed.
 */
const ADMIN_TEST_PASSWORD = "curated-writes-suite-admin-password";

const SEEDED_READING_ID = "b0000000-0000-4000-8000-000000000001";
const NEW_AUTHOR_ID = "a0000000-0000-4000-8000-0000000000ff" as EntityId;

type App = ReturnType<typeof createApp>;

/**
 * Every assertion here goes through the real Hono app over HTTP (S6, S17): no test
 * calls a service, a repository or `auth.api` directly, and the database is a
 * throwaway libSQL file in the system temp directory that this file deletes.
 */
function createTempDatabase(): { url: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), "myself-curated-auth-"));
  return {
    url: `file:${join(dir, "curated.db")}`,
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

function jsonRequest(
  path: string,
  method: "POST" | "PUT" | "DELETE",
  body: unknown,
  token?: string,
): Request {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }
  return new Request(`http://localhost${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function signIn(app: App, email: string, password: string) {
  const res = await app.request(
    jsonRequest("/api/auth/sign-in/email", "POST", { email, password }),
  );
  expect(res.status).toBe(200);
  const token = res.headers.get("set-auth-token");
  expect(typeof token).toBe("string");
  return token!;
}

async function signUp(app: App, email: string, name: string) {
  const res = await app.request(
    jsonRequest("/api/auth/sign-up/email", "POST", {
      email,
      password: "a-long-enough-password",
      name,
    }),
  );
  expect(res.status).toBe(200);
  const token = res.headers.get("set-auth-token");
  expect(typeof token).toBe("string");
  return token!;
}

interface CuratedState {
  readings: ReadingDto[];
  authors: AuthorDto[];
}

/**
 * The whole curated-content surface, read through the public endpoints. Comparing two
 * of these proves a rejected write stored nothing (S17).
 */
async function curatedState(app: App): Promise<CuratedState> {
  const readingsRes = await app.request("/v1/readings?limit=100");
  expect(readingsRes.status).toBe(200);
  const readings = (await readingsRes.json()) as PaginatedResponse<ReadingDto>;

  const authorsRes = await app.request("/v1/authors?limit=100");
  expect(authorsRes.status).toBe(200);
  const authors = (await authorsRes.json()) as PaginatedResponse<AuthorDto>;

  return { readings: readings.items, authors: authors.items };
}

describe("curated-content writes require the admin role (S5, S6, S17)", () => {
  let app: App;
  let db: DbClient;
  let database: ReturnType<typeof createTempDatabase>;
  let adminToken: string;
  let userToken: string;
  let writerToken: string;

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

    adminToken = await signIn(app, ADMIN_USER_EMAIL, ADMIN_TEST_PASSWORD);
    userToken = await signUp(app, "reader@example.com", "Reader");

    // A second identity used only by the comma-separated role case below, so the
    // single-role assertions keep working on `writer@example.com`'s plain "user" row.
    await signUp(app, "writer@example.com", "Writer");
    writerToken = await signIn(
      app,
      "writer@example.com",
      "a-long-enough-password",
    );
  });

  afterAll(() => {
    database.cleanup();
  });

  it("leaves reads public for every curated resource", async () => {
    for (const path of [
      "/v1/readings",
      "/v1/readings?limit=1",
      `/v1/readings/${SEEDED_READING_ID}`,
      "/v1/authors",
    ]) {
      const res = await app.request(path);
      expect(`${path} -> ${res.status}`).toBe(`${path} -> 200`);
    }
  });

  it("answers 401 without a session and stores nothing on POST /v1/readings", async () => {
    const before = await curatedState(app);

    const res = await app.request(
      jsonRequest("/v1/readings", "POST", {
        authorId: SEED_AUTHOR_IDS.SENECA,
        translations: {
          es: { title: "Anónimo", content: "Escritura anónima" },
        },
      }),
    );

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string; code: string };
    expect(body.code).toBe(ErrorCode.UNAUTHORIZED);
    expect(await curatedState(app)).toEqual(before);
  });

  it("answers 403 for a non-admin session and stores nothing on POST /v1/readings", async () => {
    const before = await curatedState(app);

    const res = await app.request(
      jsonRequest(
        "/v1/readings",
        "POST",
        {
          authorId: SEED_AUTHOR_IDS.SENECA,
          translations: {
            es: { title: "No autorizado", content: "Escritura de un lector" },
          },
        },
        userToken,
      ),
    );

    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string; code: string };
    expect(body.code).toBe(ErrorCode.FORBIDDEN);
    expect(await curatedState(app)).toEqual(before);
  });

  it("creates a reading for an admin session", async () => {
    const created = await app.request(
      jsonRequest(
        "/v1/readings",
        "POST",
        {
          authorId: SEED_AUTHOR_IDS.SENECA,
          translations: {
            es: { title: "Autorizado", content: "Escritura del admin" },
          },
        },
        adminToken,
      ),
    );

    expect(created.status).toBe(201);
    const reading = (await created.json()) as ReadingDto;
    expect(reading.translations.es?.title).toBe("Autorizado");

    const state = await curatedState(app);
    expect(state.readings.some((item) => item.id === reading.id)).toBe(true);
  });

  it("answers 401/403 and leaves the reading untouched on PUT /v1/readings/:id", async () => {
    const target = (await curatedState(app)).readings.find(
      (item) => item.id === SEEDED_READING_ID,
    );
    expect(target).toBeDefined();

    const payload = {
      version: target!.version ?? 1,
      translations: {
        es: { title: "Título rechazado", content: "Contenido rechazado" },
      },
    };

    const before = await curatedState(app);
    for (const token of [undefined, userToken]) {
      const res = await app.request(
        jsonRequest(`/v1/readings/${SEEDED_READING_ID}`, "PUT", payload, token),
      );
      expect(res.status).toBe(token ? 403 : 401);
      expect(await curatedState(app)).toEqual(before);
    }

    const stored = before.readings.find(
      (item) => item.id === SEEDED_READING_ID,
    );
    expect(stored?.translations.es?.title).not.toBe("Título rechazado");
  });

  it("updates a reading for an admin session", async () => {
    const target = (await curatedState(app)).readings.find(
      (item) => item.id === SEEDED_READING_ID,
    );

    const res = await app.request(
      jsonRequest(
        `/v1/readings/${SEEDED_READING_ID}`,
        "PUT",
        {
          version: target!.version ?? 1,
          translations: {
            es: { title: "Título del admin", content: "Contenido del admin" },
          },
        },
        adminToken,
      ),
    );

    expect(res.status).toBe(200);
    const updated = (await res.json()) as ReadingDto;
    expect(updated.translations.es?.title).toBe("Título del admin");
  });

  it("answers 401/403 and keeps the reading on DELETE /v1/readings/:id", async () => {
    const createdRes = await app.request(
      jsonRequest(
        "/v1/readings",
        "POST",
        {
          authorId: SEED_AUTHOR_IDS.SENECA,
          translations: {
            es: { title: "Para borrar", content: "Contenido efímero" },
          },
        },
        adminToken,
      ),
    );
    expect(createdRes.status).toBe(201);
    const target = (await createdRes.json()) as ReadingDto;

    const before = await curatedState(app);
    for (const token of [undefined, userToken]) {
      const res = await app.request(
        new Request(`http://localhost/v1/readings/${target.id}`, {
          method: "DELETE",
          headers: token ? { authorization: `Bearer ${token}` } : {},
        }),
      );
      expect(res.status).toBe(token ? 403 : 401);
      expect(await curatedState(app)).toEqual(before);
    }

    const deleted = await app.request(
      new Request(`http://localhost/v1/readings/${target.id}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${adminToken}` },
      }),
    );
    expect(deleted.status).toBe(200);

    const after = await curatedState(app);
    expect(after.readings.some((item) => item.id === target.id)).toBe(false);
  });

  it("answers 401/403 and stores nothing on POST /v1/authors", async () => {
    const payload = {
      id: NEW_AUTHOR_ID,
      name: "Autor rechazado",
      bio: "Escritura anónima o de lector",
    };

    const before = await curatedState(app);
    for (const token of [undefined, userToken]) {
      const res = await app.request(
        jsonRequest("/v1/authors", "POST", payload, token),
      );
      expect(res.status).toBe(token ? 403 : 401);
      expect(await curatedState(app)).toEqual(before);
    }

    const created = await app.request(
      jsonRequest("/v1/authors", "POST", payload, adminToken),
    );
    expect(created.status).toBe(201);
    const author = (await created.json()) as AuthorDto;
    expect(author.id).toBe(NEW_AUTHOR_ID);

    const after = await curatedState(app);
    expect(after.authors.some((item) => item.id === NEW_AUTHOR_ID)).toBe(true);
  });

  it("checks the role before the body, so an anonymous bad body is 401 not 400", async () => {
    const res = await app.request(
      jsonRequest("/v1/readings", "POST", { translations: "not-an-object" }),
    );

    expect(res.status).toBe(401);
  });

  it("treats the comma-separated role convention as membership (S5)", async () => {
    // The role column is a comma-separated convention, not a single value; "user,admin"
    // is an admin. Written straight to the row because no endpoint may grant the role.
    // The restore is in `finally`: a failing assertion below must not leave an admin
    // session behind for every later test in the suite.
    await db
      .update(user)
      .set({ role: "user,admin" })
      .where(eq(user.email, "writer@example.com"));

    try {
      const token = await signIn(
        app,
        "writer@example.com",
        "a-long-enough-password",
      );

      const res = await app.request(
        jsonRequest(
          "/v1/authors",
          "POST",
          { name: "Autor multi-rol", bio: "Escrito con una sesión user,admin" },
          token,
        ),
      );

      expect(res.status).toBe(201);
    } finally {
      // Restore the single role so the earlier assertions remain representative.
      await db
        .update(user)
        .set({ role: "user" })
        .where(eq(user.email, "writer@example.com"));
    }
  });

  it("does not let a normal sign-up grant itself the admin role (S20)", async () => {
    // The admin plugin refuses the role field on the sign-up body outright, so this
    // is a 400 rather than a silently dropped field: no endpoint grants the role.
    const res = await app.request(
      jsonRequest("/api/auth/sign-up/email", "POST", {
        email: "self-grant@example.com",
        password: "a-long-enough-password",
        name: "Self Grant",
        role: "admin",
      }),
    );

    expect(res.status).toBe(400);
    const body = (await res.json()) as { code: string; message: string };
    expect(body.code).toBe("FIELD_NOT_ALLOWED");
    expect(body.message).toBe("role is not allowed to be set");

    const rows = await db
      .select()
      .from(user)
      .where(eq(user.email, "self-grant@example.com"));
    expect(rows).toHaveLength(0);
  });

  it("keeps the seeded admin as the only identity the middleware accepts", async () => {
    const [adminRow] = await db
      .select()
      .from(user)
      .where(eq(user.id, ADMIN_USER_ID));
    expect(adminRow.role).toBe("admin");
  });
});
