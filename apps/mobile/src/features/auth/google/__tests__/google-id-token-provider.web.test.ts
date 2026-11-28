import { describe, expect, it } from "bun:test";
import {
  GOOGLE_SIGN_IN_NOT_CONFIGURED,
  GOOGLE_WEB_CLIENT_ID_ENV,
  GoogleSignInError,
  isGoogleClientIdConfigured,
} from "../google-id-token-provider.contract";
import { createGoogleIdTokenProvider } from "../google-id-token-provider.web";

/**
 * The browser's Google ID token port (S4).
 *
 * Only the parts that are not Google's: the button appears exactly when the public client
 * ID is configured, and a build with nothing configured never reaches the network. Google
 * Identity Services itself is deliberately not exercised — it is Google's script and it
 * only runs in a browser, after a person presses a button.
 */

/** Awaits `promise` and returns what it rejected with, for a readable assertion. */
async function rejection(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
    return "resolved";
  } catch (error) {
    return error;
  }
}

describe("the web Google ID token provider (S4)", () => {
  it("is available only when the public client ID is configured", () => {
    // The rule S4 states: one input, the client ID. Nothing about the platform, the build
    // or the network is allowed to decide it.
    expect(createGoogleIdTokenProvider(undefined).available).toBe(false);
    expect(createGoogleIdTokenProvider("").available).toBe(false);
    expect(createGoogleIdTokenProvider("   ").available).toBe(false);
    expect(
      createGoogleIdTokenProvider("1234-abc.apps.googleusercontent.com")
        .available,
    ).toBe(true);
  });

  it("names the public variable the value comes from", () => {
    expect(GOOGLE_WEB_CLIENT_ID_ENV).toBe("EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID");
  });

  it("ignores surrounding whitespace and refuses anything that is only whitespace", () => {
    expect(
      isGoogleClientIdConfigured("  1234-abc.apps.googleusercontent.com "),
    ).toBe(true);
    expect(isGoogleClientIdConfigured("")).toBe(false);
    expect(isGoogleClientIdConfigured(undefined)).toBe(false);
    expect(isGoogleClientIdConfigured(null)).toBe(false);
  });

  it("refuses before it touches the browser when nothing is configured", async () => {
    // There is no `document` in this runtime, so a provider that tried to load Google's
    // script anyway would throw a `ReferenceError`: the error type and its message are the
    // assertion that it never got that far.
    const failure = await rejection(
      createGoogleIdTokenProvider(undefined).requestIdToken(),
    );

    expect(failure).toBeInstanceOf(GoogleSignInError);
    expect((failure as Error).message).toBe(GOOGLE_SIGN_IN_NOT_CONFIGURED);
  });
});
