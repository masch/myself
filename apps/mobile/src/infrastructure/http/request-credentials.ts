/**
 * The fetch credential mode the app's HTTP client uses on this platform (S22, S26).
 *
 * Native presents its session as `Authorization: Bearer` (`HttpClientConfig.getAuthToken`),
 * so this client asks `fetch` for no cookie at all: leaving the mode unset is exactly the
 * behaviour it had before the web target existed, and it keeps a native request from
 * depending on a cookie jar it does not use.
 *
 * The bundler resolves `request-credentials.web.ts` instead of this file on web.
 */
export const REQUEST_CREDENTIALS: RequestCredentials | undefined = undefined;
