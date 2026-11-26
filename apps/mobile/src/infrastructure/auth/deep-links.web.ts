/**
 * The browser's own version of the two emailed links (S2, S13).
 *
 * A browser cannot open the app's custom scheme, so on this target the link comes back to
 * the page it was requested from. That origin is already trusted on the server through
 * `CORS_ALLOWED_ORIGINS`, so nothing has to be configured twice.
 *
 * Same two functions as `deep-links.ts`; the bundler resolves this file for a web build and
 * the native one everywhere else, so no consumer branches on the platform.
 */
function pageOrigin(): string {
  return typeof location === "undefined" ? "" : location.origin;
}

export function resetPasswordUrl(): string {
  return `${pageOrigin()}/reset-password`;
}

export function verifyEmailUrl(): string {
  return `${pageOrigin()}/verify-email`;
}
