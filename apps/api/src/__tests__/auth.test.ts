import { describe, expect, it } from "bun:test";
import { APIError } from "better-auth/api";
import { decryptOAuthToken, setTokenUtil } from "better-auth/oauth2";
import { entityIdSchema } from "@myself/shared";
import { AppConfig, DEFAULT_AUTH_BASE_URL, resolveAuthConfig } from "../config";
import { createAuth, runWithExecutionContext } from "../auth";
import { mapUserRow } from "../infrastructure/persistence/mappers/user.mapper";

function testConfig(bindings: Record<string, string> = {}): AppConfig {
  return AppConfig.from({
    ENVIRONMENT: "test",
    TURSO_DATABASE_URL: ":memory:",
    ...bindings,
  });
}

describe("auth configuration (S1, S14)", () => {
  it("defaults the auth base URL and leaves the secret unset when absent", () => {
    const auth = resolveAuthConfig({});

    expect(auth.baseUrl).toBe(DEFAULT_AUTH_BASE_URL);
    expect(DEFAULT_AUTH_BASE_URL).toBe("http://localhost:8787");
    expect(auth.secret).toBeUndefined();
    expect(auth.google).toBeUndefined();
  });

  it("reads the secret and the base URL from the bindings", () => {
    const auth = resolveAuthConfig({
      BETTER_AUTH_SECRET: "unit-test-secret",
      BETTER_AUTH_URL: "https://api.example.com",
    });

    expect(auth.secret).toBe("unit-test-secret");
    expect(auth.baseUrl).toBe("https://api.example.com");
  });

  it("exposes the auth configuration through AppConfig", () => {
    const config = testConfig({
      BETTER_AUTH_SECRET: "unit-test-secret",
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
    expect(resolveAuthConfig({ GOOGLE_CLIENT_ID: "client-id" }).google).toBe(
      undefined,
    );
    expect(
      resolveAuthConfig({ GOOGLE_CLIENT_SECRET: "client-secret" }).google,
    ).toBe(undefined);
    expect(
      resolveAuthConfig({
        GOOGLE_CLIENT_ID: "client-id",
        GOOGLE_CLIENT_SECRET: "client-secret",
      }).google,
    ).toEqual({ clientId: "client-id", clientSecret: "client-secret" });
  });
});

describe("Better Auth instance (S1, S14)", () => {
  it("enables email/password and the bearer + admin plugins", () => {
    const auth = createAuth(testConfig({ BETTER_AUTH_SECRET: "secret" }));

    expect(auth.options.emailAndPassword?.enabled).toBe(true);
    const pluginIds = (auth.options.plugins ?? []).map((plugin) => plugin.id);
    expect(pluginIds).toContain("bearer");
    expect(pluginIds).toContain("admin");
  });

  it("passes the secret and base URL through to Better Auth", () => {
    const auth = createAuth(
      testConfig({
        BETTER_AUTH_SECRET: "secret",
        BETTER_AUTH_URL: "https://api.example.com",
      }),
    );

    expect(auth.options.secret).toBe("secret");
    expect(auth.options.baseURL).toBe("https://api.example.com");
  });

  it("registers the Google provider only when it is configured", () => {
    const withoutGoogle = createAuth(
      testConfig({ BETTER_AUTH_SECRET: "secret" }),
    );
    expect(withoutGoogle.options.socialProviders?.google).toBeUndefined();

    const withGoogle = createAuth(
      testConfig({
        BETTER_AUTH_SECRET: "secret",
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
    const auth = createAuth(testConfig({ BETTER_AUTH_SECRET: "secret" }));

    // `x-forwarded-for` is absent on Workers, so the default would collapse the auth
    // rate limiter into one bucket.
    expect(auth.options.advanced?.ipAddress?.ipAddressHeaders).toEqual([
      "cf-connecting-ip",
    ]);
  });

  it("generates UUIDs the domain User accepts from Better Auth's id generator (L14 landmine)", () => {
    const auth = createAuth(testConfig({ BETTER_AUTH_SECRET: "secret" }));
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

      // The mapper the API uses on every read of a `user` row builds the domain
      // entity, which parses the id with `entityIdSchema`.
      expect(() =>
        mapUserRow({
          id,
          name: "Ada Lovelace",
          email: "ada@example.com",
          image: null,
          createdAt: new Date(),
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
    const auth = createAuth(testConfig({ BETTER_AUTH_SECRET: "secret" }));
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

  it("leaves updates that do not touch the identity fields alone", async () => {
    const { update } = hooksFor();

    // The admin plugin bans and the verification flow both update the `user` model
    // without carrying `name` or `email`.
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
  it("enables encryptOAuthTokens in the Better Auth options", () => {
    const auth = createAuth(testConfig({ BETTER_AUTH_SECRET: "secret" }));

    expect(auth.options.account?.encryptOAuthTokens).toBe(true);
  });

  it("stores provider tokens as ciphertext that round-trips through the context", async () => {
    const auth = createAuth(testConfig({ BETTER_AUTH_SECRET: "secret" }));
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

describe("background task dispatch (S14)", () => {
  it("hands the promise to waitUntil instead of awaiting it", () => {
    const auth = createAuth(testConfig({ BETTER_AUTH_SECRET: "secret" }));
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
    const auth = createAuth(testConfig({ BETTER_AUTH_SECRET: "secret" }));
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
