import { describe, expect, it } from "bun:test";
import {
  GOOGLE_SIGN_IN_UNAVAILABLE,
  GoogleSignInError,
} from "../google-id-token-provider.contract";
import { googleIdTokenProvider } from "../google-id-token-provider";

/**
 * The Google ID token port on a non-web target (S4).
 *
 * The bundler hands native builds `google-id-token-provider.ts`, and this run resolves the
 * same file, so these cases describe what a native sign-in screen gets: no control, and a
 * refusal with a reason if anything asks for a token anyway. The browser half is pinned in
 * `google-id-token-provider.web.test.ts`.
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

describe("the native Google ID token provider (S4)", () => {
  it("reports itself unavailable, so no screen can render a dead control", () => {
    // Native has no configured client ID and no module that can mint an ID token, so the
    // answer is always the same (S4, S27).
    expect(googleIdTokenProvider.available).toBe(false);
  });

  it("refuses with a readable error instead of resolving a token it cannot have", async () => {
    const failure = await rejection(googleIdTokenProvider.requestIdToken());

    expect(failure).toBeInstanceOf(GoogleSignInError);
    // This exact message, not merely a readable one: it is what proves the native file is
    // the one loaded here, and not the web one, which refuses differently.
    expect((failure as Error).message).toBe(GOOGLE_SIGN_IN_UNAVAILABLE);
    expect((failure as Error).message).toContain("email and password");
  });
});
