# User Authentication & Roles (from scratch)

Greenfield design: the app has no authentication today — only a device-local profile switcher. This feature introduces server-authoritative identity (email + password and Google sign-in), email verification and password reset, and a single admin role guarding curated-content writes. Per-user domain data stays on the device: no per-user synchronization is introduced.

- **Status**: open

## Specs

**S1.** Registration supports email + password and Google sign-in, both against a self-hosted auth server running on our own Hono/Workers API. No third-party auth provider (Auth0, Clerk, Firebase Auth, Supabase Auth).

**S2.** Email verification and password reset are part of v1: signup sends a verification email; a reset request sends a tokenized link; completing a reset revokes all active sessions of that user.

**S3.** Identity is server-authoritative. Better Auth 1.7 owns the schema: `user`, `session`, `account`, `verification` replace the existing `users` table in `packages/shared/src/modules/users/schema.ts`. The server `users` table is empty today, so this is a drop-and-create, not a data migration.

**S4.** The five existing FKs migrate from `users.id` to `user.id`: `tasks.user_id`, `user_question_preferences.user_id`, `user_theme_progress.user_id`, `user_reflections.user_id` (and `user_reflection_items` through `user_reflections`). All are NOT NULL with cascade today; they stay NOT NULL with cascade.

**S5.** Roles use the Better Auth `admin` plugin (`role`: `admin` | `user`, plus `banned`). Authorization is a server-side `requireRole("admin")` middleware. `role` is read from the session only, never from a request body. The first admin is created by a seed script, never by an endpoint.

**S6.** All curated-content write endpoints require the admin role: `POST/PUT/DELETE /v1/readings` and `POST /v1/authors`. Reads stay public. Today every one of these writes is fully anonymous.

**S7.** The anonymous `POST /v1/users` and the unfiltered `GET /v1/users` are removed. User listing is served by the admin plugin's endpoints, which are admin-only.

**S8.** Bearer-token sessions (`bearer` plugin): the native client authenticates with `Authorization: Bearer <session token>` and the returned `set-auth-token` header, which connects to the already-existing `HttpClientConfig.getAuthToken` (`apps/mobile/src/infrastructure/http/http-client.ts`). Cookies remain the transport for the web target only.

**S9.** Tokens are stored in `expo-secure-store` on the device, never in `expo-sqlite`.

**S10.** Per-user data (`tasks`, `user_reflections`, `user_reflection_items`, `user_theme_progress`, `user_question_preferences`) stays device-local. Out of scope, explicitly: server tables for them, push in the sync engine, conflict resolution, per-user encryption. The sync engine continues to push/pull curated content only.

**S11.** Because local rows are keyed by a locally generated user id, the first successful sign-in performs a one-time local claim: `UPDATE user_id` from the previous local id to the server `user.id` in every affected local table. No user's local history is orphaned or lost.

**S12.** `reading_logs` gains a `user_id` column. Read history is currently global on both server and device; device history must be attributable to the signed-in user.

**S13.** The client gets a sign-in screen and a session gate in the root layout, replacing `src/context/auth-context.tsx` with a session provider exposing `session.user`. `currentUser` used for local writes becomes `session.user.id`.

**S14.** Workers configuration must satisfy Better Auth's documented constraints: `compatibility_date` at or above `2025-04-01` so `process.env` is populated (current value is `2025-02-01`), `advanced.ipAddress.config.ipAddressHeaders: ["cf-connecting-ip"]` (Workers do not send `X-Forwarded-For`; without this the auth rate limiter collapses into one bucket), and `advanced.backgroundTasks.handler` wired to `waitUntil` from `cloudflare:workers` so verification and reset emails are sent after the response (not awaited, to avoid timing attacks).

**S15.** CORS moves from the current wildcard to an explicit origin allowlist with credentials.

**S16.** The email sender sits behind a single internal interface so the vendor is a detail. Until a vendor is chosen, the development implementation logs the verification/reset link and writes it to a file, mirroring Cloudflare's local `send_email` behaviour. Vendor decision is open: Cloudflare Email Service requires a domain whose DNS is on Cloudflare and Workers Paid for arbitrary recipients; Resend requires a verified domain on any DNS host.

**S17.** Tests assert, for each write endpoint in S6: 401 without a session, 403 with a non-admin session, 2xx with an admin session, and that a rejected request leaves stored content unchanged. Plus: signup → verification link → verified; login; Google sign-in against a mocked IdP; password reset revokes existing sessions; first-sign-in claim preserves pre-existing local rows.

**S18.** Turso + Drizzle adapter compatibility is unverified (no official documentation; the Better Auth demo uses Kysely for Turso). This is proven or disproven before any product schema change (T1).

**S19.** A document in `odd/tasks/` may stay open across intermediate commits by declaring `- **Status**: open`. `scripts/check-odd.sh` then skips the closed-document requirements for that file only; any other document still fails when it has pending tasks or lacks a `- **Completion & Delivery**:` line. Closure replaces the open declaration with the completed tasks and the delivery record, so the escape cannot outlive the feature.

## Tasks

- [x] **T0.5** — ODD gate: `scripts/check-odd.sh` accepts a document that declares `- **Status**: open`, so a feature document can be tracked across intermediate commits; everything else keeps failing closed. `S19`. Route: inline. Commit: pending.
- [x] **T0** — Spike: Better Auth + `@better-auth/drizzle-adapter` (`provider: "sqlite"`) against a libSQL/Turso HTTP endpoint; run `signUpEmail` and `getSession`, check date/boolean binding. `S18`. Route: inline. **DONE — PASSED, see L10.**
- [ ] **T1** — Schema migration: auth tables (`user`, `session`, `account`, `verification`), `role`, five FK repoints, `reading_logs.user_id`. `S3`,`S4`,`S5`,`S12`. Route: inline. Commit: pending.
- [ ] **T2** — API: `src/auth.ts` (Better Auth instance + `bearer` + `admin`), secrets/config, `compatibility_date`, `ipAddressHeaders`, `backgroundTasks`, `/api/auth/*` mount outside the `/v1` OpenAPI doc. `S1`,`S14`. Route: inline. Commit: pending.
- [ ] **T3** — API: `requireRole("admin")` middleware applied to the write endpoints; remove anonymous `POST`/`GET` `/v1/users`. `S5`,`S6`,`S7`. Route: inline. Commit: pending.
- [ ] **T4** — API: email sender interface + dev logger implementation; wire `sendVerificationEmail` and `sendResetPassword` with `revokeSessionsOnPasswordReset`. `S2`,`S16`. The dev sender must refuse to run in production: it logs reset tokens (review finding R1-002). Route: inline. Commit: pending.
- [ ] **T5** — API: CORS allowlist. `S15`. Route: inline. Commit: pending.
- [ ] **T6** — Mobile: `expo-secure-store` + Better Auth Expo client, session provider replacing `auth-context`, sign-in screen, root gate. `S8`,`S9`,`S13`. Route: inline. Commit: pending.
- [ ] **T7** — Mobile: one-time local claim of per-user rows on first sign-in. `S11`. Route: inline. Commit: pending.
- [ ] **T8** — Tests for the whole slice, including the 401/403 matrix. `S17`. Route: inline. Commit: pending.
- [ ] **T9** — Docs: update `AGENTS.md`/`README` for the auth surface and the vendor decision when closed. `S16`. Route: inline. Commit: pending.

## Log

**L1** (user, verbatim): "quiero evaluar agregar authentifacion de usuario con registracion user y password y que soporte authenticacion de google tambien, que liberias sin proveedor de terceros podemos usar para front y back?"

**L2** (user, decisions): v1 scope includes email verification and password reset; the stack comparison was to continue before deciding.

**L3** (user, verbatim): "y porque no usamos beter auth?" — resolved by evidence: Better Auth 1.7.28 has an official Cloudflare Workers guide, the `bearer` plugin covers native Bearer sessions, and `emailVerification`/`sendResetPassword` cover S2. Prior objections dropped: the "cookie-first" claim was wrong, and the schema collision disappears under L4.

**L4** (user, verbatim): "descartemos todo la authentacion y validacion de roles actual, revevaluemos como si la hicieramos de 0 , que nos conviene?" — evidence gathered: there is no authentication or role validation to discard; the only existing mechanism is a device-local profile switcher (`src/context/auth-context.tsx`, `currentUser = allUsers[0]`). The server `users` table is empty (server seed skips it), no per-user data exists server-side, `reading_logs` has no `user_id`, and all per-user rows live only in the device database and are never pushed by the sync engine. The real privilege gap found: curated-content writes are anonymous.

**L5** (user, decisions): per-user data stays local on the device (no server sync); roles use the Better Auth `admin` plugin rather than a single hand-rolled flag.

**L6** (user, decision): the feature document is the next step, before any implementation. Email vendor left open pending an explanation of Cloudflare Email Service; recorded as S16 because the sender hides behind one interface.

**L7** (assistant, evidence — not a requirement): Cloudflare Email Service is Beta, requires a domain with DNS on Cloudflare, allows arbitrary recipients only on Workers Paid (3,000/month included, then USD 0.35/1,000), leaves the daily quota unpublished and reputation-scaled, and simulates sends locally under `wrangler dev`. Resend requires a verified domain on any DNS host and no Workers Paid.

**L8** (user, decision): S16 stays open — no production vendor is selected. T4 implements the sender interface with the development implementation only (logs the verification/reset link), which keeps verification and reset fully implementable and testable at zero cost and zero setup. The binding constraint behind this decision: no free tier sends to arbitrary recipients without a verified domain, so the domain — not the provider — is what gates production email.

**L9** (assistant, evidence for the eventual S16 decision): free-tier survey. Resend 3,000/month capped at 100/day, no overage, official Workers guide, but without a domain only sends to the account owner's address (403 otherwise). Brevo 300/day recurring and Mailjet 6,000/month capped at 200/day both validate a single sender address through an emailed link — the closest path to no-DNS sending — but their free tiers add vendor branding. SendGrid's free tier is a 60-day trial (disqualified for a long-lived auth flow). Amazon SES is 3,000/month for 12 months only, sandboxed with production access review stated as up to 96 hours. Postmark 100/month with manual account approval. Mailgun sandbox limited to 5 authorized recipients. Cloudflare Email Service on Workers Free reaches verified addresses only. Self-hosting (Plunk, Postal, Listmonk) does not remove the domain requirement, needs a host with SMTP port 25 egress — which Workers cannot open, only 587/465 via `cloudflare:sockets` — and adds IP reputation work.

**L10** (assistant, T0 evidence — S18 resolved as PASSED): spike run on a throwaway branch `spike/better-auth-turso`, against `turso dev` (sqld on 127.0.0.1:8788 — the same HTTP/Hrana transport as remote Turso, and the path `dev:turso-local` already uses). Stack: better-auth 1.7.28 + `@better-auth/drizzle-adapter` 1.7.28 + `drizzle-orm/libsql` over `@libsql/client/web`. Schema generated by `@better-auth/cli generate`, applied with `drizzle-kit generate` + `migrate` (dialect `turso`) — the same path T1 will use. Results: `signUpEmail` returned a user plus both `set-auth-token` and `set-cookie`; the raw row showed `email_verified = 0`, `created_at = updated_at = 1795565599579` (epoch ms, sane) and `role = "user"` from the admin plugin; the password hash landed in `account.password` (161 chars, scrypt) with `provider_id = "credential"`; `getSession` resolved the user from `Authorization: Bearer <set-auth-token>`; `signInEmail` issued a second session; a wrong password was rejected; `expires_at` decoded to a correct UTC date; `internalAdapter.updateUser({ role: "admin" })` wrote through the adapter and the new role was visible through the session. Conclusion: the Drizzle adapter binds dates and booleans correctly on libSQL over HTTP, and the known `supportsDates` bug class does not reproduce here. Why it escapes that bug class: the generated schema stores timestamps as `integer`/`timestamp_ms`, not text. Config gotcha to carry into T1: `drizzleAdapter` requires the explicit `schema` object, otherwise it fails with `SCHEMA_MISMATCH` (config error, not a libSQL defect). Two residuals this spike does NOT cover: (a) password hashing ran under Bun/node `crypto`, so scrypt availability on the Workers runtime under `nodejs_compat` remains unproven — to close in T2; (b) `turso dev` is local sqld, not Turso cloud. Nothing was committed: branch, dependencies, generated files and the local database were all removed, and the repo is back on `main` with only this untracked document.

**L12** (receipt-driven review of the T0.5 commit — lineage `review-ec2f87244759263a`): approved, high tier, lenses `review-risk` and `review-reliability`, 93 authored lines, correction budget 47, no correction requested. Four non-blocking advisory findings were recorded. `R1-001`: the open escape is fail-open by design (S19) — bounded, but it does weaken the CI invariant for any document carrying the marker. `R1-002`: the development email sender logs verification and reset links; carried into T4 as a hard requirement that it refuse to run in production. `R3-odd-open-escape`: a real defect in the first implementation — the marker was matched anywhere in the file, so a fenced example or a pasted log inside the Log could waive the gate for a whole document, contradicting S19. Fixed in the following commit: the declaration must now be a top-level, fence-aware line within the document header (first 20 lines), so indented markers, markers inside fenced blocks and markers buried below the header no longer count. Verified with seven sandboxed cases: header declaration with pending tasks passes; complete closed document passes; declared-open document with a pending task inside a tilde fence passes; and a fenced-log marker, an indented marker, a marker below line 20, and `Status: closed` with pending tasks all fail. `R3-odd-open-span`: a document left marked open by mistake is not detected; accepted, because T9 removes the declaration as a required closure step.

**L13** (correction of review `review-ee3412e20c3751b4`): the fence tracking in `declares_open` only recognised backtick fences, so a `- **Status**: open` line inside a tilde (`~~~`) fence within the header would still waive the gate for a whole document — a fail-open hole the reviewer proved from the code, contradicting the comment's contract. The toggle now tracks the fence character and only closes on a matching one, so an alien fence marker inside a fence no longer flips parity. Verified with eight sandboxed cases: a header declaration passes; markers inside a backtick fence, inside a tilde fence, inside a tilde fence nested in a backtick fence, and an indented marker all fail; a document that closes a tilde fence before declaring status passes; a complete closed document passes; `Status: closed` with pending tasks fails. Accepted nuance: a fence line carrying trailing content still toggles, and the line-20 cutoff is applied before fence processing — neither can open the gate, they can only narrow or widen acceptance in the failing direction.
