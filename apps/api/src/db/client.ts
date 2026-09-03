import { createClient as createWebClient } from "@libsql/client/web";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";

export type DbClient = LibSQLDatabase<typeof schema>;

export interface DbConfig {
  url?: string;
  authToken?: string;
}

const isWorkers = (): boolean =>
  typeof navigator !== "undefined" &&
  navigator.userAgent === "Cloudflare-Workers";

const isLocalDatabase = (url: string): boolean => {
  if (isWorkers()) {
    return false;
  }
  return url.startsWith("file:") || url === ":memory:";
};

/**
 * Creates and returns a Drizzle ORM client.
 * Uses @libsql/client/web by default for remote Turso HTTP/WebSocket connections (Cloudflare Workers edge-safe),
 * and dynamically falls back to native @libsql/client for local files or :memory: in Bun/Node.
 */
export function createDb(config: DbConfig = {}): DbClient {
  let url = config.url || "file:local.db";
  const authToken = config.authToken;

  // In Cloudflare Workers, local filesystem (file: or :memory:) is unsupported.
  // We fall back to the local Turso HTTP server (http://127.0.0.1:8080) for dev.
  if (isWorkers() && (url.startsWith("file:") || url === ":memory:")) {
    url = "http://127.0.0.1:8080";
  }

  if (!isLocalDatabase(url)) {
    return drizzle(createWebClient({ url, authToken }), { schema });
  }

  // Local/Testing in Node/Bun (file or :memory:)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require("@libsql/client");
  return drizzle(createClient({ url, authToken }), { schema });
}
