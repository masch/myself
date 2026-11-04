/**
 * The DOMException name that means another document of this origin already holds
 * the database file.
 *
 * On web, `expo-sqlite` keeps its persisted database in OPFS, and OPFS allows a
 * single synchronous access handle per file per origin. A second tab therefore
 * cannot open the database: `createSyncAccessHandle` rejects with a
 * `NoModificationAllowedError`. `expo-sqlite` rebuilds that DOMException as a
 * plain `Error` on the main thread, so its name and the API it names survive only
 * as text.
 *
 * The *name* is the evidence, not the phrasing around it. OPFS raises it only
 * while another access handle or writable stream owns the same file, so for this
 * app it always means "the database is open elsewhere". Chrome's wording is not
 * part of that contract: some versions report the full
 * "Failed to execute 'createSyncAccessHandle' on 'FileSystemFileHandle' …", and
 * others the bare "No modification allowed". Requiring the API phrase as well
 * made a real conflict on those versions crash the app instead of explaining it.
 * `SecurityError` and `Invalid VFS state` are deliberately not matched: the first
 * is a refusal for a different reason, and the worker reports the second after
 * *any* failed initialization, so it says nothing about who owns the file.
 */
const ACCESS_HANDLE_CONFLICT = "NoModificationAllowedError";

function describe(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  return String(error);
}

/**
 * Whether `error` is the "database already open in another tab" failure that a
 * web second tab hits, and that the app answers with its own screen.
 */
export function isDatabaseInUseError(error: unknown): boolean {
  return describe(error).includes(ACCESS_HANDLE_CONFLICT);
}
