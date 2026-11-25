import { describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { APIError } from "better-auth/api";
import { decryptOAuthToken, setTokenUtil } from "better-auth/oauth2";
import { DateTime, type EntityId, entityIdSchema, User } from "@myself/shared";
import { AppConfig, DEFAULT_AUTH_BASE_URL, resolveAuthConfig } from "../config";
import { createAuth, runWithExecutionContext } from "../auth";
import { createTestDatabase } from "../infrastructure/persistence/test-db";

function testConfig(bindings: Record<string, string> = {}): AppConfig {
  return AppConfig.from({
    ENVIRONMENT: "test",
    TURSO_DATABASE_URL: ":memory:",
    ...bindings,
  });
}

describe("auth configuration (S1, S14)", () => {
  it("defaults the auth base URL and leaves the secret unset when absent", () => {
    const auth = resolveAuthConfig("test", {});

    expect(auth.baseUrl).toBe(DEFAULT_AUTH_BASE_URL);
    expect(DEFAULT_AUTH_BASE_URL).toBe("http://localhost:8787");
    expect(auth.secret).toBeUndefined();
    expect(auth.google).toBeUndefined();
  });

  it("reads the secret and the base URL from the bindings", () => {
    const auth = resolveAuthConfig("test", {
      AUTH_SECRET: "unit-test-secret",
      AUTH_URL: "https://api.example.com",
    });

    expect(auth.secret).toBe("unit-test-secret");
    expect(auth.baseUrl).toBe("https://api.example.com");
  });

  it("exposes the auth configuration through AppConfig", () => {
    const config = testConfig({
      AUTH_SECRET: "unit-test-secret",
      GOOGLE_CLIENT_ID: "client-id",
      GOOGLE_CLIENT_SECRET: "client-secret",
    });

    expect(config.auth.secret).toBe("unit-test-secret");
    expect(config.auth.google).toEqual({
      clientId: "client-id",
      clientSecret: "client-secret",
    });
  });

  it("includes the Google provider only when both credentials are present", () => {
    expect(
      resolveAuthConfig("test", { GOOGLE_CLIENT_ID: "client-id" }).google,
    ).toBe(undefined);
    expect(
      resolveAuthConfig("test", { GOOGLE_CLIENT_SECRET: "client-secret" })
        .google,
    ).toBe(undefined);
    expect(
      resolveAuthConfig("test", {
        GOOGLE_CLIENT_ID: "client-id",
        GOOGLE_CLIENT_SECRET: "client-secret",
      }).google,
    ).toEqual({ clientId: "client-id", clientSecret: "client-secret" });
  });

  it("requires an explicit environment, so the secret guard cannot be skipped (R3-005)", () => {
    // The environment is a required positional argument: omitting it is a compile
    // error, which the directive below asserts — an unused `@ts-expect-error` fails
    // `make check-types`, so this line is the compile-time proof. At runtime the
    // same omission is refused too, so a caller that escapes the types still cannot
    // reach the guard with an environment nobody chose.
    // @ts-expect-error - the environment argument is required
    expect(() => resolveAuthConfig()).toThrow(
      /Missing required ENVIRONMENT configuration/,
    );
  });

  it("refuses a missing or unknown environment at runtime (R3-005)", () => {
    // Defence in depth for callers that escape the type system (JS, `as any`): the
    // guard is unreachable without a resolved environment.
    expect(() => resolveAuthConfig(undefined as unknown as "test", {})).toThrow(
      /Missing required ENVIRONMENT configuration/,
    );
    expect(() =>
      resolveAuthConfig("not-an-environment" as unknown as "test", {
        AUTH_SECRET: "unit-test-secret",
      }),
    ).toThrow(/Invalid ENVIRONMENT configuration/);
  });

  it("reaches the staging secret guard only with an explicit environment", () => {
    expect(() => resolveAuthConfig("staging", {})).toThrow(/AUTH_SECRET/);
    expect(() => resolveAuthConfig("production", {})).toThrow(/AUTH_SECRET/);
  });
});

describe("Better Auth instance (S1, S14)", () => {
  it("enables email/password and the bearer + admin plugins", () => {
    const auth = createAuth(testConfig({ AUTH_SECRET: "secret" }));

    expect(auth.options.emailAndPassword?.enabled).toBe(true);
    const pluginIds = (auth.options.plugins ?? []).map((plugin) => plugin.id);
    expect(pluginIds).toContain("bearer");
    expect(pluginIds).toContain("admin");
  });

  it("passes the secret and base URL through to Better Auth", () => {
    const auth = createAuth(
      testConfig({
        AUTH_SECRET: "secret",
        AUTH_URL: "https://api.example.com",
      }),
    );

    expect(auth.options.secret).toBe("secret");
    expect(auth.options.baseURL).toBe("https://api.example.com");
  });

  it("registers the Google provider only when it is configured", () => {
    const withoutGoogle = createAuth(testConfig({ AUTH_SECRET: "secret" }));
    expect(withoutGoogle.options.socialProviders?.google).toBeUndefined();

    const withGoogle = createAuth(
      testConfig({
        AUTH_SECRET: "secret",
        GOOGLE_CLIENT_ID: "client-id",
        GOOGLE_CLIENT_SECRET: "client-secret",
      }),
    );
    expect(withGoogle.options.socialProviders?.google).toMatchObject({
      clientId: "client-id",
      clientSecret: "client-secret",
    });
  });

  it("reads client IPs from the Cloudflare Workers header (S14)", () => {
    const auth = createAuth(testConfig({ AUTH_SECRET: "secret" }));

    // `x-forwarded-for` is absent on Workers, so the default would collapse the auth
    // rate limiter into one bucket.
    expect(auth.options.advanced?.ipAddress?.ipAddressHeaders).toEqual([
      "cf-connecting-ip",
    ]);
  });

  it("generates UUIDs the domain User accepts from Better Auth's id generator (L14 landmine)", () => {
    const auth = createAuth(testConfig({ AUTH_SECRET: "secret" }));
    const generateId = auth.options.advanced?.database?.generateId;
    expect(typeof generateId).toBe("function");
    const newId = generateId as (options: {
      model: string;
      size?: number;
    }) => string;

    for (let index = 0; index < 5; index += 1) {
      const id = newId({ model: "user" });
      expect(id).not.toMatch(/^[0-9a-z]{32}$/);
      expect(() => entityIdSchema.parse(id)).not.toThrow();

      // The domain `User` is what every consumer builds from an identity id, and it
      // parses that id with `entityIdSchema` (the removed `/v1/users` mapper used to
      // be the API-side proof; S7 moved the same assertion onto the domain entity).
      expect(
        () =>
          new User({
            id: id as EntityId,
            name: "Ada Lovelace",
            email: "ada@example.com",
            imageUrl: null,
            createdAt: DateTime.from(new Date().toISOString()),
          }),
      ).not.toThrow();
    }
  });
});

describe("user identity write hooks (S3)", () => {
  type CreateHook = (
    user: Record<string, unknown>,
    ctx: null,
  ) => Promise<unknown>;
  type UpdateHook = (
    data: Record<string, unknown>,
    ctx: null,
  ) => Promise<unknown>;

  function hooksFor() {
    const auth = createAuth(testConfig({ AUTH_SECRET: "secret" }));
    const create = auth.options.databaseHooks?.user?.create
      ?.before as unknown as CreateHook;
    const update = auth.options.databaseHooks?.user?.update
      ?.before as unknown as UpdateHook;
    return { create, update };
  }

  function identity(name: string, email: string) {
    return {
      id: "a0000000-0000-4000-8000-000000000001",
      name,
      email,
      emailVerified: false,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  it("registers a create and an update hook for the user model", () => {
    const { create, update } = hooksFor();

    expect(typeof create).toBe("function");
    expect(typeof update).toBe("function");
  });

  it("rejects a blank name on create with a 400 APIError", async () => {
    const { create } = hooksFor();

    const error = await create(identity("   ", "ada@example.com"), null).catch(
      (thrown: unknown) => thrown,
    );

    expect(error).toBeInstanceOf(APIError);
    expect((error as InstanceType<typeof APIError>).statusCode).toBe(400);
    expect((error as InstanceType<typeof APIError>).body?.message).toBe(
      "User name is required",
    );
  });

  it("rejects a malformed email on create with a 400 APIError", async () => {
    const { create } = hooksFor();

    const error = await create(identity("Ada Lovelace", "nope"), null).catch(
      (thrown: unknown) => thrown,
    );

    expect(error).toBeInstanceOf(APIError);
    expect((error as InstanceType<typeof APIError>).statusCode).toBe(400);
    expect((error as InstanceType<typeof APIError>).body?.message).toBe(
      "Invalid email address",
    );
  });

  it("lets a valid identity through on create", async () => {
    const { create } = hooksFor();

    expect(
      create(identity("Ada Lovelace", "ada@example.com"), null),
    ).resolves.toBeUndefined();
  });

  it("rejects a blank name on update with a 400 APIError", async () => {
    const { update } = hooksFor();

    const error = await update({ name: "   " }, null).catch(
      (thrown: unknown) => thrown,
    );

    expect(error).toBeInstanceOf(APIError);
    expect((error as InstanceType<typeof APIError>).statusCode).toBe(400);
    expect((error as InstanceType<typeof APIError>).body?.message).toBe(
      "User name is required",
    );
  });

  it("rejects a malformed email on update", async () => {
    const { update } = hooksFor();

    const error = await update({ email: "not-an-email" }, null).catch(
      (thrown: unknown) => thrown,
    );

    expect(error).toBeInstanceOf(APIError);
    expect((error as InstanceType<typeof APIError>).body?.message).toBe(
      "Invalid email address",
    );
  });

  it("rejects an explicit null name on update with a 400 APIError (R3-002)", async () => {
    const { update } = hooksFor();

    // `undefined` means "not being written"; `null` is a caller asking for a null
    // identity field, which the domain `User` rejects on every later read.
    const error = await update({ name: null }, null).catch(
      (thrown: unknown) => thrown,
    );

    expect(error).toBeInstanceOf(APIError);
    expect((error as InstanceType<typeof APIError>).statusCode).toBe(400);
    expect((error as InstanceType<typeof APIError>).body?.message).toBe(
      "Invalid user name: expected a string, received null",
    );
  });

  it("rejects an explicit null email on update with a 400 APIError (R3-002)", async () => {
    const { update } = hooksFor();

    const error = await update({ email: null }, null).catch(
      (thrown: unknown) => thrown,
    );

    expect(error).toBeInstanceOf(APIError);
    expect((error as InstanceType<typeof APIError>).statusCode).toBe(400);
    expect((error as InstanceType<typeof APIError>).body?.message).toBe(
      "Invalid user email: expected a string, received null",
    );
  });

  it("leaves updates that do not touch the identity fields alone", async () => {
    const { update } = hooksFor();

    // The admin plugin bans and the verification flow both update the `user` model
    // without carrying `name` or `email`, so an absent field stays skippable.
    expect(
      update({ name: undefined, image: null }, null),
    ).resolves.toBeUndefined();
    expect(update({ role: "admin" }, null)).resolves.toBeUndefined();
  });

  it("lets a valid name through on update", async () => {
    const { update } = hooksFor();

    expect(update({ name: "Ada Lovelace" }, null)).resolves.toBeUndefined();
  });
});

describe("provider token encryption (S3)", () => {
  function warningsWhile<T>(fn: () => T): { result: T; warnings: string[] } {
    const original = console.warn;
    const warnings: string[] = [];
    console.warn = (...args: unknown[]) => {
      warnings.push(args.map((arg) => String(arg)).join(" "));
    };
    try {
      return { result: fn(), warnings };
    } finally {
      console.warn = original;
    }
  }

  it("enables encryptOAuthTokens in the Better Auth options", () => {
    const auth = createAuth(testConfig({ AUTH_SECRET: "secret" }));

    expect(auth.options.account?.encryptOAuthTokens).toBe(true);
  });

  it("enables encryption when a secret is configured and warns about nothing (R1-001)", () => {
    const { result: auth, warnings } = warningsWhile(() =>
      createAuth(testConfig({ AUTH_SECRET: "secret" })),
    );

    expect(auth.options.account?.encryptOAuthTokens).toBe(true);
    expect(warnings).toEqual([]);
  });

  it("never encrypts under Better Auth's default secret and warns once instead (R1-001)", () => {
    // Development and test boot without a secret, and Better Auth then derives the
    // key from its publicly known default, so a ciphertext there is not confidential.
    const { result: auth, warnings } = warningsWhile(() =>
      createAuth(testConfig()),
    );

    expect(auth.options.account?.encryptOAuthTokens).toBe(false);
    expect(warnings).toHaveLength(1);
    // Anchored on a fragment that cannot appear if the message still names the old
    // variable: a bare name assertion is satisfied by any stale prefix that contains it.
    expect(warnings[0]).toContain("Set AUTH_SECRET to encrypt");
    expect(warnings[0]).toContain("unencrypted");
  });

  it("claims only the access and refresh tokens the library actually encrypts (L22)", () => {
    // Better Auth 1.7.28 encrypts `account.access_token` and `account.refresh_token`
    // and writes `id_token` as received, so the warning must not advertise
    // ID-token encryption the library does not perform.
    const { warnings } = warningsWhile(() => createAuth(testConfig()));

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("access and refresh tokens");
    expect(warnings[0]).not.toContain("ID");
  });

  it("stores provider tokens as ciphertext that round-trips through the context", async () => {
    const auth = createAuth(testConfig({ AUTH_SECRET: "secret" }));
    // The library types this parameter as its own `AuthContext`, which the
    // plugin-augmented context type does not structurally satisfy.
    type TokenContext = Parameters<typeof setTokenUtil>[1];
    const ctx = (await auth.$context) as unknown as TokenContext;
    const plaintext = "ya29.plaintext-google-access-token";

    // `setTokenUtil` is the library's only write path for `account.access_token`
    // and friends, so exercising it with this instance's own context observes the
    // real storage shape rather than just the option flag.
    const stored = await setTokenUtil(plaintext, ctx);

    expect(typeof stored).toBe("string");
    expect(stored).not.toBe(plaintext);
    expect(stored).not.toContain(plaintext);
    expect(await decryptOAuthToken(stored as string, ctx)).toBe(plaintext);
  });
});

describe("auth rate limiting (S14, L22)", () => {
  const RATE_LIMIT_SECRET = "rate-limit-unit-test-secret";

  function configFor(environment: string): AppConfig {
    return AppConfig.from({
      ENVIRONMENT: environment,
      TURSO_DATABASE_URL: ":memory:",
      AUTH_SECRET: RATE_LIMIT_SECRET,
    });
  }

  it("enables the limiter in the deployed environments and keeps it off locally (L22)", () => {
    // The limiter is explicit because Better Auth only enables it when `NODE_ENV`
    // says production, and this app sets `ENVIRONMENT` instead: without this, the
    // sign-in throttle is silently off in every environment, staging included.
    const expected: Record<string, boolean> = {
      production: true,
      staging: true,
      development: false,
      test: false,
    };

    for (const [environment, enabled] of Object.entries(expected)) {
      const auth = createAuth(configFor(environment));
      expect(`${environment} -> ${auth.options.rateLimit?.enabled}`).toBe(
        `${environment} -> ${enabled}`,
      );
    }
  });

  it("keeps the library's own windows and limits for the throttled environments (L22)", () => {
    const production = createAuth(configFor("production")).options.rateLimit;

    // Better Auth 1.7.28 defaults: 100 requests per 10 seconds, plus its stricter
    // built-in rule for `/sign-in*` and `/sign-up*` (3 per 10 seconds).
    expect(production?.window).toBe(10);
    expect(production?.max).toBe(100);
  });

  it("throttles repeated sign-in attempts in production and not in test (L22)", async () => {
    const database = mkdtempSync(join(tmpdir(), "myself-rate-limit-"));
    const url = `file:${join(database, "rate-limit.db")}`;
    try {
      const db = await createTestDatabase({ seed: true, url });
      expect(db).toBeDefined();

      async function signInAttempts(ip: string): Promise<number[]> {
        const auth = createAuth(
          AppConfig.from({
            ENVIRONMENT: "production",
            TURSO_DATABASE_URL: url,
            AUTH_SECRET: RATE_LIMIT_SECRET,
          }),
        );
        const statuses: number[] = [];
        for (let attempt = 0; attempt < 4; attempt += 1) {
          const res = await auth.handler(
            new Request("http://localhost/api/auth/sign-in/email", {
              method: "POST",
              headers: {
                "content-type": "application/json",
                "cf-connecting-ip": ip,
              },
              body: JSON.stringify({
                email: "nobody@example.com",
                password: "wrong-password",
              }),
            }),
          );
          statuses.push(res.status);
        }
        return statuses;
      }

      // The library's special sign-in rule is 3 requests per 10 seconds, so the
      // fourth attempt from one address is refused before it reaches the handler.
      const throttled = await signInAttempts("198.51.100.11");
      expect(throttled.slice(0, 3)).toEqual([401, 401, 401]);
      expect(throttled[3]).toBe(429);

      // The same four attempts from the test environment are not throttled: local,
      // deployment-free runs are not the surface this limiter protects.
      const unthrottled: number[] = [];
      const localAuth = createAuth(
        AppConfig.from({
          ENVIRONMENT: "test",
          TURSO_DATABASE_URL: url,
          AUTH_SECRET: RATE_LIMIT_SECRET,
        }),
      );
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const res = await localAuth.handler(
          new Request("http://localhost/api/auth/sign-in/email", {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "cf-connecting-ip": "198.51.100.12",
            },
            body: JSON.stringify({
              email: "nobody@example.com",
              password: "wrong-password",
            }),
          }),
        );
        unthrottled.push(res.status);
      }
      expect(unthrottled).toEqual([401, 401, 401, 401]);
    } finally {
      rmSync(database, { recursive: true, force: true });
    }
  });
});

describe("background task dispatch (S14)", () => {
  it("hands the promise to waitUntil instead of awaiting it", () => {
    const auth = createAuth(testConfig({ AUTH_SECRET: "secret" }));
    const handler = auth.options.advanced?.backgroundTasks?.handler;
    expect(typeof handler).toBe("function");

    let captured: Promise<unknown> | undefined;
    let settled = false;
    const task = new Promise<void>((resolve) => {
      setTimeout(() => {
        settled = true;
        resolve();
      }, 10);
    });

    const returned = runWithExecutionContext(
      {
        waitUntil: (promise) => {
          captured = promise;
        },
      },
      () => handler!(task),
    );

    expect(returned).toBeUndefined();
    expect(settled).toBe(false);
    expect(captured).toBe(task);
  });

  it("degrades safely when no Workers execution context exists", async () => {
    const auth = createAuth(testConfig({ AUTH_SECRET: "secret" }));
    const handler = auth.options.advanced?.backgroundTasks?.handler;

    let sent = false;
    const task = Promise.resolve().then(() => {
      sent = true;
    });

    expect(() => handler!(task)).not.toThrow();
    await task;
    expect(sent).toBe(true);

    // A rejected background task must not surface as an unhandled rejection.
    const failing = Promise.resolve().then(() => {
      throw new Error("smtp unreachable");
    });
    expect(() => handler!(failing)).not.toThrow();
    await failing.catch(() => undefined);
  });
});
