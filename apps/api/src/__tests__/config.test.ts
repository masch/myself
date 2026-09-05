import { describe, expect, it } from "bun:test";
import { AppConfig, resolveEnvironment } from "../config";
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

  describe("AppConfig", () => {
    it("loads config from explicit bindings", () => {
      const config = AppConfig.from({
        ENVIRONMENT: Environments.STAGING,
        TURSO_DATABASE_URL: "libsql://example.turso.io",
        TURSO_AUTH_TOKEN: "secret-token",
      });

      expect(config.environment).toBe(Environments.STAGING);
      expect(config.database.url).toBe("libsql://example.turso.io");
      expect(config.database.authToken).toBe("secret-token");
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
