import { createClient as createWebClient } from "@libsql/client/web";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";

export type DbClient = LibSQLDatabase<typeof schema>;

export interface DbConfig {
  url: string;
  authToken?: string;
}

export const IN_MEMORY_DB = ":memory:";

export const isWorkers = (): boolean =>
  typeof navigator !== "undefined" &&
  navigator.userAgent === "Cloudflare-Workers";

export const isLocalDatabase = (url: string): boolean => {
  if (isWorkers()) {
    return false;
  }
  return url.startsWith("file:") || url === IN_MEMORY_DB;
};

/**
 * Creates and returns a Drizzle ORM client.
 * Uses @libsql/client/web by default for remote Turso HTTP/WebSocket connections (Cloudflare Workers edge-safe),
 * and dynamically falls back to native @libsql/client for local files or :memory: in Bun/Node.
 */
export function createDb(config: DbConfig): DbClient {
  const { url, authToken } = config;

  // In Cloudflare Workers, local filesystem (file: or :memory:) is unsupported.
  if (isWorkers() && (url.startsWith("file:") || url === IN_MEMORY_DB)) {
    throw new Error(
      "Cloudflare Workers does not support local SQLite file or in-memory databases. Configure a remote Turso database URL (TURSO_DATABASE_URL).",
    );
  }

  if (!isLocalDatabase(url)) {
    return drizzle(createWebClient({ url, authToken }), { schema });
  }

  // Local/Testing in Node/Bun (file or :memory:)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require("@libsql/client");
  return drizzle(createClient({ url, authToken }), { schema });
}
