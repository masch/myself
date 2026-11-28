/**
 * The web credential mode: the session is the cookie, so the browser must send it.
 *
 * Better Auth sets an `HttpOnly` session cookie on sign-in (S26), and the web client
 * keeps no token of its own across a page load (S22), so without `include` every request
 * made after a reload goes out with no credential and the admin gate answers 401. This
 * is the same mode the auth client already uses (`COOKIE_MODE` in
 * `infrastructure/auth/auth-client.ts`); the curated-content client simply never asked.
 *
 * Nothing is read out of the response and nothing is persisted: the browser's own cookie
 * jar carries the session, which is what keeps the token out of any script-readable store.
 * The API must allow the origin with credentials (T5's explicit allowlist, S15) for the
 * browser to keep the response.
 *
 * The bundler resolves this file instead of `request-credentials.ts` on web.
 */
export const REQUEST_CREDENTIALS: RequestCredentials | undefined = "include";
