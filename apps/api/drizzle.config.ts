import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: [
    "../../packages/shared/src/modules/authors/schema.ts",
    "../../packages/shared/src/modules/readings/schema.ts",
    "../../packages/shared/src/modules/users/schema.ts",
    "../../packages/shared/src/modules/tasks/schema.ts",
  ],
  out: "../../packages/shared/src/migrations",
  dialect: "turso",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL ?? "file:local.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
});
