import { afterAll, afterEach, beforeAll, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { eq } from "drizzle-orm";
import { account, session, user } from "@myself/shared";
import { createApp } from "../../app";
import { AppConfig } from "../../config";
import {
  createDb,
  type DbClient,
} from "../../infrastructure/persistence/client";
import { createTestDatabase } from "../../infrastructure/persistence/test-db";
import { MOCK_GOOGLE_CLIENT_ID, MockedGoogleIdp } from "./mocked-google-idp";

/**
 * Google sign-in against a mocked IdP (S17, T8).
 *
 * Everything runs over HTTP against the real app built by `createApp(config)`: the
 * request is `POST /api/auth/sign-in/social` with `{ provider: "google", idToken }`,
 * which is the non-browser path S8 chose (no redirect, no `@better-auth/expo`). Only
 * Google's JWKS fetch is mocked, through `globalThis.fetch` and for that host alone
 * (see `./mocked-google-idp.ts`); the token itself is signed locally with a key pair
 * this suite generates, so the verified signature is a real one.
 *
 * Shape note, read out of the installed library rather than assumed: the request body
 * field is `idToken: { token: string, nonce?, accessToken?, … }`
 * (`better-auth/dist/api/routes/sign-in.mjs`, `socialSignInBodySchema`), not a bare
 * string. The successful response is `{ redirect: false, token, user }`, plus the
 * `set-auth-token` header the bearer plugin adds on any response that set a session
 * cookie — and the library accepts either the header value or the bare `token` as
 * `Authorization: Bearer`.
 */

// Throwaway secret for the API instance this file builds: it only ever signs sessions
// for a database created in the system temp directory and deleted when the file ends.
const AUTH_SECRET = "dGhpcy1pcy1hLXRlc3Qtc2VjcmV0LWZvci1nb29nbGUtdG9rZW5z";

// The client secret is never used by the ID token path — only the client id is (it is
// the token's audience) — but the provider is only described when both are configured.
const GOOGLE_CLIENT_SECRET = "mocked-google-client-secret";

const SESSION_TOKEN_PATH = "http://localhost/api/auth/get-session";

/**
 * `POST /api/auth/sign-in/social` with an ID token, exactly as a native client sends it
 * (S8): one JSON request, no redirect, no cookie jar.
 */
function signInSocialRequest(idToken: string): Request {
  return new Request("http://localhost/api/auth/sign-in/social", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ provider: "google", idToken: { token: idToken } }),
  });
}

/** Resolves a bearer token the way the native client does (S8). */
function sessionRequest(token: string): Request {
  return new Request(SESSION_TOKEN_PATH, {
    headers: { authorization: `Bearer ${token}` },
  });
}

interface SignInResponseBody {
  redirect: boolean;
  token?: string;
  user: { id: string; email: string; name: string };
}

describe("Google sign-in against a mocked IdP (S17, T8)", () => {
  let app: ReturnType<typeof createApp>;
  let db: DbClient;
  let directory: string;
  let idp: MockedGoogleIdp;

  /** Every row count the refusal cases must leave untouched. */
  async function rowCounts(): Promise<{
    users: number;
    sessions: number;
    accounts: number;
  }> {
    const users = await db.select().from(user);
    const sessions = await db.select().from(session);
    const accounts = await db.select().from(account);
    return {
      users: users.length,
      sessions: sessions.length,
      accounts: accounts.length,
    };
  }

  beforeAll(async () => {
    idp = await MockedGoogleIdp.create();
    directory = mkdtempSync(join(tmpdir(), "myself-google-sign-in-"));
    const url = `file:${join(directory, "google-sign-in.db")}`;
    const config = AppConfig.from({
      ENVIRONMENT: "test",
      TURSO_DATABASE_URL: url,
      AUTH_SECRET: AUTH_SECRET,
      AUTH_URL: "http://localhost:8787",
      GOOGLE_CLIENT_ID: MOCK_GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: GOOGLE_CLIENT_SECRET,
    });
    // Migrations only: this suite creates its own identities through the flow, so the
    // demo and admin seeds would only add rows the counts below would have to ignore.
    db = await createTestDatabase({ seed: false, url });
    app = createApp(config);
  });

  afterEach(() => {
    // `globalThis.fetch` is shared by the whole Bun run, so the mock never outlives
    // the test that installed it.
    idp.restoreFetchMock();
  });

  afterAll(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  it("creates a session for an ID token signed by the mocked IdP (S8, S17)", async () => {
    idp.installFetchMock();
    const idToken = await idp.mintIdToken({
      sub: "google-sub-1001",
      email: "ada.google@example.com",
      name: "Ada Google",
      picture: "https://example.com/ada.png",
    });

    const res = await app.request(signInSocialRequest(idToken));

    expect(res.status).toBe(200);
    const body = (await res.json()) as SignInResponseBody;
    expect(body.redirect).toBe(false);
    expect(body.user.email).toBe("ada.google@example.com");
    expect(body.user.name).toBe("Ada Google");

    // The token was verified against the served JWKS, not accepted on shape: the
    // provider had to ask Google for its keys and got the JWK this suite published.
    // One fetch, because the token carries the published `kid`.
    expect(idp.jwksRequests).toBe(1);

    // The bearer transport (S8): the header the library adds on a response that set a
    // session cookie. Its value is `<raw session token>.<HMAC>`; the response body also
    // carries the bare token. Both are the same credential.
    const headerToken = res.headers.get("set-auth-token");
    expect(typeof headerToken).toBe("string");
    expect(headerToken!.length).toBeGreaterThan(0);
    const [rawToken, signature] = headerToken!.split(".");
    expect(rawToken).toBe(body.token!);
    expect(signature!.length).toBeGreaterThan(0);

    // The header token resolves to that identity through the real handler.
    const resolved = await app.request(sessionRequest(headerToken!));
    expect(resolved.status).toBe(200);
    const resolvedBody = (await resolved.json()) as {
      user: { id: string; email: string };
      session: { token: string };
    };
    expect(resolvedBody.user.id).toBe(body.user.id);
    expect(resolvedBody.user.email).toBe("ada.google@example.com");
    expect(resolvedBody.session.token).toBe(rawToken!);

    // The bare token from the response body is accepted too, so the session the flow
    // reports is the session that exists.
    const viaBodyToken = await app.request(sessionRequest(body.token!));
    expect(viaBodyToken.status).toBe(200);
    expect(
      ((await viaBodyToken.json()) as { user: { id: string } }).user.id,
    ).toBe(body.user.id);

    // The `user` row exists and carries what the ID token supplied.
    const [storedUser] = await db
      .select()
      .from(user)
      .where(eq(user.id, body.user.id));
    expect(storedUser).toBeDefined();
    expect(storedUser.email).toBe("ada.google@example.com");
    expect(storedUser.name).toBe("Ada Google");
    expect(storedUser.image).toBe("https://example.com/ada.png");
    // Google asserts `email_verified`, so the created identity is verified.
    expect(storedUser.emailVerified).toBe(true);

    // `sub` becomes the provider account id (`accountSubject: ({ profile }) => profile.sub`),
    // which is the stable key a second Google sign-in resolves against.
    const [storedAccount] = await db
      .select()
      .from(account)
      .where(eq(account.userId, body.user.id));
    expect(storedAccount).toBeDefined();
    expect(storedAccount.providerId).toBe("google");
    expect(storedAccount.accountId).toBe("google-sub-1001");

    // The session row exists for that user (S25 keeps the expiry in the row).
    const [storedSession] = await db
      .select()
      .from(session)
      .where(eq(session.token, rawToken!));
    expect(storedSession).toBeDefined();
    expect(storedSession.userId).toBe(body.user.id);
    expect(storedSession.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("refuses an ID token whose signature does not verify (S17)", async () => {
    idp.installFetchMock();
    const before = await rowCounts();

    // Well-formed RS256 over the claims Google would send, signed by a key pair that
    // is never published — and carrying the published `kid`, so the refusal can only
    // come from the signature check and not from an unknown key id.
    const forged = await idp.mintIdToken(
      {
        sub: "google-sub-forged",
        email: "forged.google@example.com",
        name: "Forged Google",
      },
      { signWith: "unpublished" },
    );

    const res = await app.request(signInSocialRequest(forged));

    expect(res.status).toBe(401);
    const body = (await res.json()) as { message?: string };
    expect(body.message).toBe("Invalid token");
    // No credential of any kind leaves the server.
    expect(res.headers.get("set-auth-token")).toBeNull();
    expect(res.headers.get("set-cookie")).toBeNull();
    // Verification really ran (the keys were fetched *for this request*), so the
    // refusal is the signature check and not an earlier shape rejection.
    expect(idp.jwksRequests).toBeGreaterThan(0);

    // Nothing was created: no user, no session, no provider account.
    expect(await rowCounts()).toEqual(before);
    const created = await db
      .select()
      .from(user)
      .where(eq(user.email, "forged.google@example.com"));
    expect(created).toHaveLength(0);
  });

  it("refuses an expired ID token, while the same claims with a live expiry are accepted (S17)", async () => {
    idp.installFetchMock();
    const before = await rowCounts();
    const nowSeconds = Math.floor(Date.now() / 1000);

    const expired = await idp.mintIdToken(
      {
        sub: "google-sub-expired",
        email: "expired.google@example.com",
        name: "Expired Google",
        // Inside the provider's one-hour maximum token age, so expiry is the only
        // claim that can be refused.
        iat: nowSeconds - 1800,
      },
      { expiresAt: nowSeconds - 120 },
    );

    const res = await app.request(signInSocialRequest(expired));

    expect(res.status).toBe(401);
    const body = (await res.json()) as { message?: string };
    expect(body.message).toBe("Invalid token");
    expect(res.headers.get("set-auth-token")).toBeNull();
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(idp.jwksRequests).toBeGreaterThan(0);

    expect(await rowCounts()).toEqual(before);
    const created = await db
      .select()
      .from(user)
      .where(eq(user.email, "expired.google@example.com"));
    expect(created).toHaveLength(0);

    // The control that keeps this case honest: the same claims, the same key and the
    // same request are accepted as soon as `exp` is live, so the refusal above is the
    // expiry and not something else about the token.
    const live = await idp.mintIdToken({
      sub: "google-sub-expired",
      email: "expired.google@example.com",
      name: "Expired Google",
    });
    const accepted = await app.request(signInSocialRequest(live));
    expect(accepted.status).toBe(200);
    const acceptedBody = (await accepted.json()) as SignInResponseBody;
    expect(acceptedBody.user.email).toBe("expired.google@example.com");
  });
});
