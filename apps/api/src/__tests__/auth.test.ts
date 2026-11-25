import { describe, expect, it } from "bun:test";
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
