import { describe, expect, it } from "bun:test";
import { isDatabaseInUseError } from "../database-open-error";

/**
 * The message the browser reports when a second tab of the same origin tries to
 * open the OPFS-backed database. `expo-sqlite` re-wraps the worker error in a
 * plain `Error`, so the DOMException name survives only inside the text.
 */
const REAL_CONFLICT_MESSAGE =
  "NoModificationAllowedError: Failed to execute 'createSyncAccessHandle' on " +
  "'FileSystemFileHandle': Access Handles cannot be created if there is " +
  "another open Access Handle or Writable stream associated with the same file.";

describe("isDatabaseInUseError", () => {
  it("recognizes the access handle conflict the browser reports", () => {
    expect(isDatabaseInUseError(new Error(REAL_CONFLICT_MESSAGE))).toBe(true);
  });

  it("recognizes the conflict when it arrives as a DOMException", () => {
    const error = Object.assign(new Error("Failed to execute"), {
      name: "NoModificationAllowedError",
    });
    expect(isDatabaseInUseError(error)).toBe(true);
  });

  it("recognizes a worker whose pool never initialized", () => {
    // The first failed attempt leaves `_sqlite3` cached and `_vfs` unset, so
    // every later attempt reports this instead of the original conflict.
    expect(isDatabaseInUseError(new Error("Invalid VFS state"))).toBe(true);
  });

  it("leaves unrelated database failures to the error boundary", () => {
    expect(isDatabaseInUseError(new Error("Error finalizing statement"))).toBe(
      false,
    );
    expect(
      isDatabaseInUseError(
        new Error("Database not found - nativeDatabaseId[0]"),
      ),
    ).toBe(false);
    expect(isDatabaseInUseError(undefined)).toBe(false);
    expect(isDatabaseInUseError(null)).toBe(false);
  });
});
