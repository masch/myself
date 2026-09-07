import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "../../packages/shared/src/db/schema/index.ts",
  out: "../../packages/shared/src/db/migrations",
  dialect: "turso",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL ?? "file:local.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
});
