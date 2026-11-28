/**
 * A stand-in for Google's identity provider (S17, T8).
 *
 * Google's ID tokens are verified by Better Auth 1.7.28 against Google's published
 * JWKS: `@better-auth/core/dist/social-providers/google.mjs` declares
 * `idToken.jwks: (header) => getGooglePublicKey(header.kid)`, and that helper fetches
 * `https://www.googleapis.com/oauth2/v3/certs` through `fetchRefusingRedirects`, i.e.
 * through `globalThis.fetch`. So the provider needs no module mock at all — replacing
 * `globalThis.fetch` for that one host is enough, and every other request keeps
 * reaching the real implementation.
 *
 * Everything else is real: the RSA key pair is generated here with WebCrypto, the
 * public half is published as a JWK (`kid`/`alg: "RS256"`/`use: "sig"`), and the ID
 * tokens are signed locally with the private half. The claims match what the installed
 * provider requires — issuer `https://accounts.google.com` (or `accounts.google.com`),
 * audience = the configured client id, `exp` in the future, `iat` within the provider's
 * one-hour maximum token age, and `sub`/`email`/`name`/`picture`, which
 * `getUserInfo` maps onto the created `user` row and `accountSubject` maps onto
 * `account.accountId`.
 *
 * This module lives in the test directory on purpose: it is test support, never part of
 * the Worker bundle.
 */

/** Where the installed Google provider fetches its signing keys (`google.mjs:147`). */
export const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";

/** Host the mocked IdP answers for; every other host passes straight through. */
const GOOGLE_HOST = "www.googleapis.com";

/** Client id the mocked IdP mints tokens for; the app must be configured with it. */
export const MOCK_GOOGLE_CLIENT_ID =
  "mocked-client-id.apps.googleusercontent.com";

/** `kid` of the key the mocked IdP publishes in its JWKS. */
const PUBLISHED_KID = "mocked-google-key-1";

/** Issuer claim Google uses, one of the two the provider accepts. */
const GOOGLE_ISSUER = "https://accounts.google.com";

/** Lifetime of a minted token: one hour, the provider's maximum token age. */
const TOKEN_LIFETIME_SECONDS = 3600;

/** The claims the provider reads off a Google ID token. */
export interface GoogleIdTokenClaims {
  iss: string;
  aud: string;
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture?: string;
  iat: number;
  exp: number;
}

/** How a token is signed, as opposed to what it claims. */
export interface MintIdTokenOptions {
  /**
   * `kid` advertised in the JWT header. Defaults to the published key's id, so a
   * forgery test can present the *same* `kid` and fail on the signature alone
   * instead of failing because the key id is unknown.
   */
  kid?: string;
  /**
   * Which private key signs the token.
   *
   * `"published"` is the key the mocked JWKS serves, so the signature verifies.
   * `"unpublished"` is a second key pair that is never published: the signature is
   * well-formed RS256 and cannot verify against the served JWK.
   */
  signWith?: "published" | "unpublished";
  /** Absolute `exp`, in seconds since the epoch. Defaults to one hour from now. */
  expiresAt?: number;
}

/**
 * A published key: the RSA half WebCrypto exports plus the fields a JWKS entry carries.
 *
 * `kid` is not part of the Workers `JsonWebKey` type, so it is added here rather than
 * cast onto the served object.
 */
type PublishedJwk = JsonWebKey & { kid: string; alg: string; use: string };

/** A generated RSA key pair, kept together so a token can be signed with it. */
interface SigningKeys {
  kid: string;
  pair: CryptoKeyPair;
  publicJwk: PublishedJwk;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function encodeSegment(value: unknown): string {
  return base64UrlEncode(new TextEncoder().encode(JSON.stringify(value)));
}

async function generateSigningKeys(kid: string): Promise<SigningKeys> {
  const pair = (await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  )) as CryptoKeyPair;

  const exported = (await crypto.subtle.exportKey(
    "jwk",
    pair.publicKey,
  )) as PublishedJwk;

  return {
    kid,
    pair,
    // `alg`/`use` are what the provider's `importJWK(jwk, "RS256")` expects to see;
    // the `kty`/`n`/`e` half comes from WebCrypto itself.
    publicJwk: {
      kty: exported.kty,
      n: exported.n,
      e: exported.e,
      kid,
      alg: "RS256",
      use: "sig",
    },
  };
}

/** The URL a `fetch` call is for, whether it was given a string, URL or Request. */
function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input;
  }
  if (input instanceof URL) {
    return input.href;
  }
  return input.url;
}

/**
 * One mocked Google IdP: two key pairs, the JWK set it publishes, and the signed
 * tokens it mints.
 *
 * The fetch mock is installed and removed per test instead of at module level:
 * `globalThis.fetch` is shared by the whole Bun run, and a leak would silently change
 * what every other suite's fetches do.
 */
export class MockedGoogleIdp {
  private readonly published: SigningKeys;
  private readonly unpublished: SigningKeys;
  private originalFetch: typeof fetch | undefined;
  private requestsToGoogle = 0;

  private constructor(published: SigningKeys, unpublished: SigningKeys) {
    this.published = published;
    this.unpublished = unpublished;
  }

  static async create(): Promise<MockedGoogleIdp> {
    return new MockedGoogleIdp(
      await generateSigningKeys(PUBLISHED_KID),
      // The rogue key advertises the published `kid` as well: publishing a key id is
      // not a secret, and claiming it must not be enough to be believed.
      await generateSigningKeys(PUBLISHED_KID),
    );
  }

  /**
   * How many times the provider asked Google for its keys (i.e. verified a token)
   * since the mock was installed. The counter restarts with every install, so a case
   * can assert its own verification instead of inheriting an earlier one.
   */
  get jwksRequests(): number {
    return this.requestsToGoogle;
  }

  /**
   * Routes Google's certs endpoint to the local JWKS and lets every other request
   * through unchanged.
   *
   * A request to the Google host that is *not* the certs path throws instead of being
   * served: it would mean the sign-in flow talks to a second Google endpoint, which
   * this mock does not model and a silent pass-through would hide.
   */
  installFetchMock(): void {
    if (this.originalFetch) {
      throw new Error("The mocked Google IdP is already installed");
    }
    const original = globalThis.fetch;
    this.originalFetch = original;
    this.requestsToGoogle = 0;
    const keys = [this.published.publicJwk];

    globalThis.fetch = (async (
      input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> => {
      const url = requestUrl(input);
      if (new URL(url).host === GOOGLE_HOST) {
        if (url !== GOOGLE_JWKS_URL) {
          throw new Error(
            `The mocked Google IdP only answers ${GOOGLE_JWKS_URL}, but the app requested ${url}`,
          );
        }
        this.requestsToGoogle += 1;
        return new Response(JSON.stringify({ keys }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return original.call(globalThis, input, init);
    }) as typeof fetch;
  }

  /** Puts the real `globalThis.fetch` back; safe to call when nothing is installed. */
  restoreFetchMock(): void {
    if (!this.originalFetch) {
      return;
    }
    globalThis.fetch = this.originalFetch;
    this.originalFetch = undefined;
  }

  /**
   * Signs an ID token the way Google would.
   *
   * The protocol claims are filled in with values the installed provider accepts, and
   * the caller supplies the identity ones (`sub`, `email`, `name`, …) plus any
   * override it needs.
   */
  async mintIdToken(
    claims: Partial<GoogleIdTokenClaims> = {},
    options: MintIdTokenOptions = {},
  ): Promise<string> {
    const { signWith = "published", expiresAt } = options;
    const signing =
      signWith === "published" ? this.published : this.unpublished;
    const now = Math.floor(Date.now() / 1000);

    const payload: GoogleIdTokenClaims = {
      iss: GOOGLE_ISSUER,
      aud: MOCK_GOOGLE_CLIENT_ID,
      sub: "",
      email: "",
      name: "",
      email_verified: true,
      iat: now,
      exp: now + TOKEN_LIFETIME_SECONDS,
    };
    // Override field by field rather than by a `Partial<…>` spread, which would widen
    // every claim to `string | undefined`.
    Object.assign(
      payload,
      Object.fromEntries(
        Object.entries(claims).filter(([, value]) => value !== undefined),
      ),
    );
    if (expiresAt !== undefined) {
      payload.exp = expiresAt;
    }

    const signingInput = `${encodeSegment({
      alg: "RS256",
      kid: options.kid ?? signing.kid,
      typ: "JWT",
    })}.${encodeSegment(payload)}`;

    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      signing.pair.privateKey,
      new TextEncoder().encode(signingInput),
    );

    return `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`;
  }
}
