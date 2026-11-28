import { account, session, user, verification } from "./schema";

export * from "./schema";
export * from "./roles";
export * from "./demo-user";
export * from "./admin-user";

/**
 * The explicit schema object the Drizzle adapter needs (L10).
 *
 * `drizzleAdapter(db, { provider, schema })` must be handed the auth tables by name;
 * without it the adapter fails with `SCHEMA_MISMATCH` at the first query. Keeping the
 * object here means the runtime and the schema generator cannot drift apart: adding a
 * table to `schema.ts` only requires adding it to this map.
 */
export const authSchema = {
  user,
  session,
  account,
  verification,
};
