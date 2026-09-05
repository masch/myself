import { join } from "node:path";
import { describe, expect, it } from "bun:test";
import { migrate } from "drizzle-orm/libsql/migrator";
import { createDb, isLocalDatabase } from "../client";
import { seedDatabase, seedFromConfig } from "../seed";
import { AppConfig } from "../../config";

describe("Database Client Factory Unit Tests", () => {
  it("initializes local SQLite client when url is local", () => {
    const dbMemory = createDb({ url: ":memory:" });
    expect(dbMemory).toBeDefined();

    const dbFile = createDb({ url: "file:test.db" });
    expect(dbFile).toBeDefined();

    expect(isLocalDatabase(":memory:")).toBe(true);
    expect(isLocalDatabase("file:test.db")).toBe(true);
    expect(isLocalDatabase("libsql://example.turso.io")).toBe(false);
  });

  it("initializes web client when url is remote", () => {
    const dbRemote = createDb({
      url: "libsql://test-db.turso.io",
      authToken: "test-token",
    });
    expect(dbRemote).toBeDefined();
  });

  it("initializes web client when running inside Cloudflare Workers edge environment", () => {
    const originalUserAgent = navigator.userAgent;
    Object.defineProperty(navigator, "userAgent", {
      value: "Cloudflare-Workers",
      configurable: true,
    });
    try {
      const dbWorkers = createDb({ url: "http://127.0.0.1:8080" });
      expect(dbWorkers).toBeDefined();

      expect(() => createDb({ url: "file:test.db" })).toThrow(
        "Cloudflare Workers does not support local SQLite file or in-memory databases",
      );
    } finally {
      Object.defineProperty(navigator, "userAgent", {
        value: originalUserAgent,
        configurable: true,
      });
    }
  });

  it("seeds the database directly with seedDatabase", async () => {
    const db = createDb({ url: ":memory:" });
    const migrationsFolder = join(import.meta.dir, "../migrations");
    await migrate(db, { migrationsFolder });
    await seedDatabase(db);
  });

  it("runs seedFromConfig successfully with explicit AppConfig", async () => {
    const config = new AppConfig({
      ENVIRONMENT: "test",
      TURSO_DATABASE_URL: ":memory:",
    });
    await seedFromConfig(config);
  });

  it("runs database seeding script CLI successfully", async () => {
    const proc = Bun.spawn(["bun", "run", "scripts/seed.ts"], {
      env: {
        ...Bun.env,
        ENVIRONMENT: "test",
        TURSO_DATABASE_URL: ":memory:",
      },
      stdout: "pipe",
    });
    const code = await proc.exited;
    expect(code).toBe(0);
  });
});
