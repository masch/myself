import { describe, expect, it } from "bun:test";
import { AppConfig } from "../config";

describe("AppConfig Unit Tests", () => {
  it("loads config from explicit bindings", () => {
    const config = AppConfig.from({
      TURSO_DATABASE_URL: "libsql://example.turso.io",
      TURSO_AUTH_TOKEN: "secret-token",
    });

    expect(config.database.url).toBe("libsql://example.turso.io");
    expect(config.database.authToken).toBe("secret-token");
  });

  it("throws an explicit error when TURSO_DATABASE_URL is missing", () => {
    expect(() => new AppConfig({})).toThrow(
      "Missing required configuration: TURSO_DATABASE_URL",
    );
  });
});
