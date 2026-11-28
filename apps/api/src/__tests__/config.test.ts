import { describe, expect, it } from "bun:test";
import {
  AppConfig,
  COOKIE_SAME_SITE_VALUES,
  DEFAULT_COOKIE_SAME_SITE,
  DEFAULT_PORT,
  getProcessEnv,
  resolveCookieConfig,
  resolveDatabaseConfig,
  resolveEnvironment,
  resolvePort,
} from "../config";
import { Environments } from "../types";

describe("AppConfig & resolveEnvironment Unit Tests", () => {
  describe("resolveEnvironment", () => {
    it("resolves recognized environment strings", () => {
      expect(resolveEnvironment("production")).toBe(Environments.PRODUCTION);
      expect(resolveEnvironment("staging")).toBe(Environments.STAGING);
      expect(resolveEnvironment("development")).toBe(Environments.DEVELOPMENT);
      expect(resolveEnvironment("test")).toBe(Environments.TEST);
    });

    it("throws when environment string is missing or empty", () => {
      expect(() => resolveEnvironment(undefined)).toThrow(
        /Missing required ENVIRONMENT configuration/,
      );
      expect(() => resolveEnvironment("")).toThrow(
        /Missing required ENVIRONMENT configuration/,
      );
    });

    it("throws when environment string is invalid", () => {
      expect(() => resolveEnvironment("stagin")).toThrow(
        /Invalid ENVIRONMENT configuration/,
      );
      expect(() => resolveEnvironment("local")).toThrow(
        /Invalid ENVIRONMENT configuration/,
      );
    });
  });

  describe("resolveDatabaseConfig", () => {
    it("resolves valid database configuration with auth token", () => {
      const config = resolveDatabaseConfig(
        "libsql://db.turso.io",
        "secret-token",
      );
      expect(config.url).toBe("libsql://db.turso.io");
      expect(config.authToken).toBe("secret-token");
    });

    it("resolves valid database configuration without auth token", () => {
      const config = resolveDatabaseConfig("file:local.db");
      expect(config.url).toBe("file:local.db");
      expect(config.authToken).toBeUndefined();
    });

    it("throws when url is missing or empty", () => {
      expect(() => resolveDatabaseConfig(undefined)).toThrow(
        "Missing required configuration: TURSO_DATABASE_URL",
      );
      expect(() => resolveDatabaseConfig("")).toThrow(
        "Missing required configuration: TURSO_DATABASE_URL",
      );
    });
  });

  describe("resolvePort", () => {
    it("returns DEFAULT_PORT when raw is missing or empty", () => {
      expect(resolvePort(undefined)).toBe(DEFAULT_PORT);
      expect(resolvePort("")).toBe(DEFAULT_PORT);
    });

    it("parses valid port string into number", () => {
      expect(resolvePort("3000")).toBe(3000);
      expect(resolvePort("8080")).toBe(8080);
      expect(resolvePort("65535")).toBe(65535);
    });

    it("throws when port is invalid or not positive", () => {
      expect(() => resolvePort("not-a-number")).toThrow(
        /Invalid PORT configuration/,
      );
      expect(() => resolvePort("-1")).toThrow(/Invalid PORT configuration/);
      expect(() => resolvePort("0")).toThrow(/Invalid PORT configuration/);
      expect(() => resolvePort("65536")).toThrow(/Invalid PORT configuration/);
      expect(() => resolvePort("8080abc")).toThrow(
        /Invalid PORT configuration/,
      );
      expect(() => resolvePort("1.5")).toThrow(/Invalid PORT configuration/);
    });
  });

  describe("session cookie posture (S2)", () => {
    it("defaults to SameSite=Lax everywhere and only secures the deployed environments", () => {
      // Nothing weakens unless it is asked for: the default is the same in every
      // environment, and `None` is a deployment's explicit decision (S2).
      expect(DEFAULT_COOKIE_SAME_SITE).toBe("lax");

      for (const environment of [Environments.DEVELOPMENT, Environments.TEST]) {
        const cookie = resolveCookieConfig(environment);
        expect(cookie.sameSite).toBe("lax");
        expect(cookie.secure).toBe(false);
      }

      for (const environment of [
        Environments.STAGING,
        Environments.PRODUCTION,
      ]) {
        const cookie = resolveCookieConfig(environment);
        expect(cookie.sameSite).toBe("lax");
        // A deployed Worker is only reachable over https, so its cookie is Secure.
        expect(cookie.secure).toBe(true);
      }
    });

    it("keeps HttpOnly and the cookie path in the resolved attributes (S22)", () => {
      // A cookie a script can read is the thing S22 forbids, so `httpOnly` is part of
      // the resolved attributes rather than left to the library's default.
      const cookie = resolveCookieConfig(Environments.PRODUCTION);
      expect(cookie.httpOnly).toBe(true);
      expect(cookie.path).toBe("/");
    });

    it("selects the policy from AUTH_COOKIE_SAME_SITE", () => {
      expect(
        resolveCookieConfig(Environments.PRODUCTION, {
          AUTH_COOKIE_SAME_SITE: "strict",
        }).sameSite,
      ).toBe("strict");

      const crossSite = resolveCookieConfig(Environments.PRODUCTION, {
        AUTH_COOKIE_SAME_SITE: "none",
      });
      expect(crossSite.sameSite).toBe("none");
      // `None` is only meaningful with `Secure`, and a deployed environment has it.
      expect(crossSite.secure).toBe(true);
    });

    it("refuses SameSite=None without Secure, naming the value and the rule (S2)", () => {
      for (const environment of [Environments.DEVELOPMENT, Environments.TEST]) {
        // A browser drops `SameSite=None` without `Secure`, which is a web session
        // that silently stops working, so it must be a startup refusal instead.
        expect(() =>
          resolveCookieConfig(environment, { AUTH_COOKIE_SAME_SITE: "none" }),
        ).toThrow(
          /Invalid AUTH_COOKIE_SAME_SITE configuration: "none" requires a Secure cookie/,
        );
        expect(() =>
          resolveCookieConfig(environment, { AUTH_COOKIE_SAME_SITE: "none" }),
        ).toThrow(new RegExp(`ENVIRONMENT="${environment}"`));
      }
    });

    it("refuses a SameSite value outside lax|strict|none (S2)", () => {
      for (const value of ["nullable", "cross-site", "laxx", "Lax"]) {
        expect(() =>
          resolveCookieConfig(Environments.PRODUCTION, {
            AUTH_COOKIE_SAME_SITE: value,
          }),
        ).toThrow(/Invalid AUTH_COOKIE_SAME_SITE configuration/);
      }

      // The message names the offending value and the rule, so a deployment can fix
      // it without reading the source.
      expect(() =>
        resolveCookieConfig(Environments.PRODUCTION, {
          AUTH_COOKIE_SAME_SITE: "nullable",
        }),
      ).toThrow(
        /Invalid AUTH_COOKIE_SAME_SITE configuration: "nullable"\. Expected one of: lax, strict, none/,
      );
      expect(COOKIE_SAME_SITE_VALUES).toEqual(["lax", "strict", "none"]);
    });

    it("exposes the posture through the resolved auth configuration (S2)", () => {
      const config = new AppConfig({
        ENVIRONMENT: Environments.TEST,
        TURSO_DATABASE_URL: ":memory:",
      });

      expect(config.auth.cookies).toEqual({
        sameSite: "lax",
        secure: false,
        httpOnly: true,
        path: "/",
      });

      expect(
        () =>
          new AppConfig({
            ENVIRONMENT: Environments.TEST,
            TURSO_DATABASE_URL: ":memory:",
            AUTH_COOKIE_SAME_SITE: "none",
          }),
      ).toThrow(/requires a Secure cookie/);
    });

    it("maps AUTH_COOKIE_SAME_SITE from process.env", () => {
      const original = process.env.AUTH_COOKIE_SAME_SITE;
      process.env.AUTH_COOKIE_SAME_SITE = "strict";
      try {
        expect(getProcessEnv().AUTH_COOKIE_SAME_SITE).toBe("strict");
      } finally {
        if (original === undefined) {
          delete process.env.AUTH_COOKIE_SAME_SITE;
        } else {
          process.env.AUTH_COOKIE_SAME_SITE = original;
        }
      }
    });
  });

  describe("getProcessEnv", () => {
    it("returns bindings extracted from process.env", () => {
      const originalEnv = process.env.ENVIRONMENT;
      process.env.ENVIRONMENT = "test";
      try {
        const env = getProcessEnv();
        expect(env.ENVIRONMENT).toBe("test");
      } finally {
        process.env.ENVIRONMENT = originalEnv;
      }
    });

    it("AppConfig.from merges getProcessEnv with overrides", () => {
      const originalEnv = process.env.ENVIRONMENT;
      const originalUrl = process.env.TURSO_DATABASE_URL;

      process.env.ENVIRONMENT = "test";
      process.env.TURSO_DATABASE_URL = ":memory:";

      try {
        const config = AppConfig.from({
          ENVIRONMENT: "staging",
          AUTH_SECRET: "unit-test-secret",
        });
        expect(config.environment).toBe("staging");
        expect(config.database.url).toBe(":memory:");
      } finally {
        process.env.ENVIRONMENT = originalEnv;
        process.env.TURSO_DATABASE_URL = originalUrl;
      }
    });

    it("maps ADMIN_USER_PASSWORD from process.env (R1-001)", () => {
      const original = process.env.ADMIN_USER_PASSWORD;
      process.env.ADMIN_USER_PASSWORD = "admin-password-from-the-environment";
      try {
        expect(getProcessEnv().ADMIN_USER_PASSWORD).toBe(
          "admin-password-from-the-environment",
        );
      } finally {
        if (original === undefined) {
          delete process.env.ADMIN_USER_PASSWORD;
        } else {
          process.env.ADMIN_USER_PASSWORD = original;
        }
      }
    });
  });

  describe("AppConfig", () => {
    it("keeps the admin seed password optional, trimmed and never defaulted (R1-001)", () => {
      // The developer's own environment must not decide what this test observes.
      const original = process.env.ADMIN_USER_PASSWORD;
      delete process.env.ADMIN_USER_PASSWORD;
      try {
        const absent = AppConfig.from({
          ENVIRONMENT: "test",
          TURSO_DATABASE_URL: ":memory:",
        });
        expect(absent.adminUserPassword).toBeUndefined();

        const blank = AppConfig.from({
          ENVIRONMENT: "test",
          TURSO_DATABASE_URL: ":memory:",
          ADMIN_USER_PASSWORD: "   ",
        });
        expect(blank.adminUserPassword).toBeUndefined();

        const supplied = AppConfig.from({
          ENVIRONMENT: "test",
          TURSO_DATABASE_URL: ":memory:",
          ADMIN_USER_PASSWORD: "  supplied-by-the-operator  ",
        });
        expect(supplied.adminUserPassword).toBe("supplied-by-the-operator");
      } finally {
        if (original !== undefined) {
          process.env.ADMIN_USER_PASSWORD = original;
        }
      }
    });

    it("loads config from explicit bindings", () => {
      const config = AppConfig.from({
        ENVIRONMENT: Environments.STAGING,
        TURSO_DATABASE_URL: "libsql://example.turso.io",
        TURSO_AUTH_TOKEN: "secret-token",
        AUTH_SECRET: "unit-test-secret",
      });

      expect(config.environment).toBe(Environments.STAGING);
      expect(config.database.url).toBe("libsql://example.turso.io");
      expect(config.database.authToken).toBe("secret-token");
      expect(config.port).toBe(DEFAULT_PORT);
    });

    it("loads port from explicit bindings", () => {
      const config = AppConfig.from({
        ENVIRONMENT: Environments.STAGING,
        TURSO_DATABASE_URL: "libsql://example.turso.io",
        AUTH_SECRET: "unit-test-secret",
        PORT: "4000",
      });
      expect(config.port).toBe(4000);
    });

    it("rejects a staging config without a Better Auth secret", () => {
      // Better Auth's own default-secret guard keys off NODE_ENV, which this app
      // never sets, so `ENVIRONMENT=staging` would silently use its public default
      // secret and make every session forgeable.
      expect(
        () =>
          new AppConfig({
            ENVIRONMENT: Environments.STAGING,
            TURSO_DATABASE_URL: "libsql://example.turso.io",
          }),
      ).toThrow(/AUTH_SECRET/);
    });

    it("rejects a blank Better Auth secret in production", () => {
      expect(
        () =>
          new AppConfig({
            ENVIRONMENT: Environments.PRODUCTION,
            TURSO_DATABASE_URL: "libsql://example.turso.io",
            AUTH_SECRET: "   ",
          }),
      ).toThrow(/AUTH_SECRET/);
    });

    it("boots without a secret in development, local and test", () => {
      for (const environment of [Environments.DEVELOPMENT, Environments.TEST]) {
        const config = new AppConfig({
          ENVIRONMENT: environment,
          TURSO_DATABASE_URL: ":memory:",
        });
        expect(config.auth.secret).toBeUndefined();
      }
    });

    it("keeps Google independent of the secret requirement", () => {
      const config = new AppConfig({
        ENVIRONMENT: Environments.TEST,
        TURSO_DATABASE_URL: ":memory:",
        GOOGLE_CLIENT_ID: "client-id",
        GOOGLE_CLIENT_SECRET: "client-secret",
      });

      expect(config.auth.secret).toBeUndefined();
      expect(config.auth.google).toEqual({
        clientId: "client-id",
        clientSecret: "client-secret",
      });
    });

    it("throws an explicit error when TURSO_DATABASE_URL is missing", () => {
      expect(
        () => new AppConfig({ ENVIRONMENT: Environments.DEVELOPMENT }),
      ).toThrow("Missing required configuration: TURSO_DATABASE_URL");
    });

    it("throws an explicit error when ENVIRONMENT is missing", () => {
      const originalEnv = process.env.ENVIRONMENT;
      delete process.env.ENVIRONMENT;

      try {
        expect(
          () =>
            new AppConfig({
              TURSO_DATABASE_URL: "libsql://example.turso.io",
            }),
        ).toThrow(/Missing required ENVIRONMENT configuration/);
      } finally {
        process.env.ENVIRONMENT = originalEnv;
      }
    });

    it("throws an explicit error when ENVIRONMENT is invalid", () => {
      expect(
        () =>
          new AppConfig({
            ENVIRONMENT: "invalid-env" as any,
            TURSO_DATABASE_URL: "libsql://example.turso.io",
          }),
      ).toThrow(/Invalid ENVIRONMENT configuration/);
    });
  });
});
