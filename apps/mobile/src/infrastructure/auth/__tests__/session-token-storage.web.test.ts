import { describe, expect, it } from "bun:test";

/**
 * Web session-token storage (S22).
 *
 * The browser has no SecureStore, so the token lives in memory for the lifetime of
 * the page and the browser's own cookie jar carries the session across reloads.
 * These tests pin the in-memory behaviour and the platform split that keeps
 * `expo-secure-store` out of the web bundle.
 */
const webStorageModule = await import("../session-token-storage.web");

const SRC_DIR = new URL("../../..", import.meta.url).pathname;
const NATIVE_STORAGE_MODULE = "infrastructure/auth/session-token-storage.ts";

function importSpecifiers(source: string): string[] {
  return Array.from(
    source.matchAll(/(?:from\s+|require\(\s*|import\(\s*)["']([^"']+)["']/g),
    (match) => match[1],
  );
}

async function sourceOf(relativePath: string): Promise<string> {
  return Bun.file(`${SRC_DIR}${relativePath}`).text();
}

describe("sessionTokenStorage (web, in-memory)", () => {
  it("keeps the token for the page lifetime and reports no session when empty", async () => {
    const { sessionTokenStorage } = webStorageModule;

    await sessionTokenStorage.clear();
    expect(await sessionTokenStorage.get()).toBeNull();

    await sessionTokenStorage.set("token-web");
    expect(await sessionTokenStorage.get()).toBe("token-web");
  });

  it("clears the token on sign-out", async () => {
    const { sessionTokenStorage } = webStorageModule;

    await sessionTokenStorage.set("token-web");
    await sessionTokenStorage.clear();

    expect(await sessionTokenStorage.get()).toBeNull();
  });

  it("imports no native module and no browser persistent storage", async () => {
    const source = await sourceOf(
      "infrastructure/auth/session-token-storage.web.ts",
    );
    const specifiers = importSpecifiers(source);

    // Specifiers, not the prose above them: this module documents why SecureStore is
    // absent, and that sentence must not fail its own assertion.
    expect(specifiers.length).toBeGreaterThan(0);
    expect(specifiers).not.toContain("expo-secure-store");
    expect(specifiers).not.toContain("expo-sqlite");
    expect(source).not.toContain("localStorage");
    expect(source).not.toContain("sessionStorage");
    expect(source).not.toContain("document.cookie");
  });

  it("is the only importer of expo-secure-store in the source tree", async () => {
    const importers: string[] = [];

    for await (const relativePath of new Bun.Glob("**/*.{ts,tsx}").scan({
      cwd: SRC_DIR,
    })) {
      if (relativePath.includes("__tests__")) continue;
      const source = await sourceOf(relativePath);
      if (importSpecifiers(source).includes("expo-secure-store")) {
        importers.push(relativePath);
      }
    }

    // One importer, and it is the native module the bundler swaps out on web. A new
    // importer anywhere else is how the native module would reach the web bundle.
    expect(importers).toEqual([NATIVE_STORAGE_MODULE]);
  });
});
