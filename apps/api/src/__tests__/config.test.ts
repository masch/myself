import { describe, expect, it } from "bun:test";
import {
  AppConfig,
  DEFAULT_PORT,
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

  describe("resolvePort", () => {
    it("returns DEFAULT_PORT when raw is missing or empty", () => {
      expect(resolvePort(undefined)).toBe(DEFAULT_PORT);
      expect(resolvePort("")).toBe(DEFAULT_PORT);
    });

    it("parses valid port string into number", () => {
      expect(resolvePort("3000")).toBe(3000);
      expect(resolvePort("8080")).toBe(8080);
    });

    it("throws when port is invalid or not positive", () => {
      expect(() => resolvePort("not-a-number")).toThrow(
        /Invalid PORT configuration/,
      );
      expect(() => resolvePort("-1")).toThrow(/Invalid PORT configuration/);
      expect(() => resolvePort("0")).toThrow(/Invalid PORT configuration/);
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
      expect(config.port).toBe(DEFAULT_PORT);
    });

    it("loads port from explicit bindings", () => {
      const config = AppConfig.from({
        ENVIRONMENT: Environments.STAGING,
        TURSO_DATABASE_URL: "libsql://example.turso.io",
        PORT: "4000",
      });
      expect(config.port).toBe(4000);
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
