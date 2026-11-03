/**
 * The two texts that, together, identify the failure of opening the persisted
 * database because another tab of the same origin already owns it.
 *
 * On web, `expo-sqlite` keeps its persisted database in OPFS, and OPFS allows a
 * single synchronous access handle per file per origin. A second tab therefore
 * cannot open the database: `createSyncAccessHandle` rejects with a
 * `NoModificationAllowedError`. `expo-sqlite` rebuilds that DOMException as a
 * plain `Error` on the main thread, so its name and the API it names survive
 * only as text.
 *
 * Both are required, and nothing else counts as evidence. The browser raises
 * `NoModificationAllowedError` from `createSyncAccessHandle` only while another
 * access handle or writable stream holds the same file, so a rejection for any
 * other reason stays the real error it is. `Invalid VFS state` is deliberately
 * not matched: the worker reports it after *any* failed initialization, so it
 * says nothing about who owns the file.
 */
const ACCESS_HANDLE_CONFLICT = [
  "NoModificationAllowedError",
  "createSyncAccessHandle",
];

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
  const description = describe(error);

  return ACCESS_HANDLE_CONFLICT.every((part) => description.includes(part));
}
