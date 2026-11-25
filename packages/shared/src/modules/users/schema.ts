/**
 * Identity tables no longer live in this module (S3): Better Auth owns the
 * `user`, `session`, `account` and `verification` tables in `../auth/schema.ts`.
 *
 * This module keeps only the domain types. Do not add a table definition back here;
 * every foreign key that used to point at the legacy `users` table now points at
 * `user.id` (S4).
 */
export {};
