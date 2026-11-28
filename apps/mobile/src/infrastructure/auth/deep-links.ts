/**
 * The links a reset or verification email may hand to this client (S2, S13).
 *
 * Better Auth builds the link it emails from the server's base URL plus a caller-supplied
 * `redirectTo` (reset) or `callbackURL` (verification), and it validates that target
 * against `trustedOrigins`. A native client is reached through its own scheme — `myself`,
 * declared in `apps/mobile/app.json` — so the two origins below are what
 * `APP_DEEP_LINK_ORIGINS` trusts on the server and what this module asks for.
 *
 * These two functions are the whole contract with `deep-links.web.ts`, which satisfies the
 * same pair for the browser target, where a custom scheme cannot be opened. Nothing else
 * branches on the platform.
 */
export function resetPasswordUrl(): string {
  return "myself://reset-password";
}

export function verifyEmailUrl(): string {
  return "myself://verify-email";
}
