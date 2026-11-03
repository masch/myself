/**
 * Recognizes the failure of opening the persisted database because another tab
 * of the same origin already owns it.
 *
 * On web, `expo-sqlite` keeps its persisted database in OPFS, and OPFS allows a
 * single synchronous access handle per file per origin. A second tab therefore
 * cannot open the database: `createSyncAccessHandle` rejects with a
 * `NoModificationAllowedError`. `expo-sqlite` rebuilds that DOMException as a
 * plain `Error` on the main thread, so its name and the API it names survive
 * only as text.
 *
 * The pattern list also covers a database VFS that never finished initializing.
 * The worker caches the SQLite module before it creates the VFS, so when the
 * first attempt fails every later attempt in that same worker reports
 * `Invalid VFS state` instead of repeating the original conflict.
 */
const DATABASE_IN_USE_PATTERNS = [
  "NoModificationAllowedError",
  "createSyncAccessHandle",
  "Invalid VFS state",
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

  return DATABASE_IN_USE_PATTERNS.some((pattern) =>
    description.includes(pattern),
  );
}
