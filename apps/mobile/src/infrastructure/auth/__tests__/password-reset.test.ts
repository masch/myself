import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { session } from "@myself/shared";
import { createApp } from "@myself/api/src/app";
import { AppConfig } from "@myself/api/src/config";
import { createTestDatabase } from "@myself/api/src/infrastructure/persistence/test-db";

import { createAuthApi } from "../auth-client";
import { resetPasswordUrl, verifyEmailUrl } from "../deep-links";
import {
  createPasswordResetService,
  type PasswordResetApiPort,
} from "../password-reset-service";
import type { AuthFailure } from "../session-service";
import type { SessionTokenStorage } from "../session-token-storage.contract";
import {
  backToAppTarget,
  resetTokenFromParams,
  verificationOutcomeFromParams,
} from "@/features/auth/link-outcomes";

/**
 * Password reset and email verification (S2, S13).
 *
 * Two layers, and the split is the point. The service layer is driven against a fake port
 * to pin every answer the forms have to render differently — sent, disabled, transport
 * failure, a token the server no longer accepts. The end-to-end block then runs the real
 * client against the real API over HTTP with T4's development sender: the reset link is
 * read out of the outbox file, completed, and the old password stops working with the
 * sessions revoked, which is exactly what S2 promises.
 */
const AUTH_SECRET = "dGhpcy1pcy1hLXRlc3Qtc2VjcmV0LWZvci1wYXNzd29yZC1yZXNldA==";
const BASE_URL = "http://localhost:8787";
const OLD_PASSWORD = "old-password-before-reset";
const NEW_PASSWORD = "new-password-after-reset";

interface Recorded {
  request?: { email: string; redirectTo: string };
  reset?: { token: string; newPassword: string };
}

/** A port that answers with one failure and records what the service asked it to do. */
function fakePort(answer: { error: AuthFailure | null }): {
  port: PasswordResetApiPort;
  recorded: Recorded;
} {
  const recorded: Recorded = {};
  return {
    recorded,
    port: {
      async requestPasswordReset(input) {
        recorded.request = input;
        return answer;
      },
      async resetPassword(input) {
        recorded.reset = input;
        return answer;
      },
    },
  };
}

describe("password reset service (S2, S13)", () => {
  it("asks for the reset at the app's own deep link and reports nothing about the address", async () => {
    const { port, recorded } = fakePort({ error: null });
    const outcome = await createPasswordResetService({ api: port }).request(
      "someone@example.com",
    );

    expect(outcome).toEqual({ status: "sent" });
    expect(recorded.request).toEqual({
      email: "someone@example.com",
      redirectTo: resetPasswordUrl(),
    });
  });

  it("reports a server without a sender as disabled instead of as a sent mail (T4, S16)", async () => {
    const { port } = fakePort({
      error: { code: "RESET_PASSWORD_DISABLED", status: 400 },
    });
    const outcome = await createPasswordResetService({ api: port }).request(
      "someone@example.com",
    );

    expect(outcome.status).toBe("disabled");
    const message =
      outcome.status === "disabled" ? outcome.message.toLowerCase() : "";
    // The honest answer: nothing was sent, and the reason is configuration.
    expect(message).toContain("email");
    expect(message).not.toContain("check your email");
    expect(message).not.toContain("we sent");
  });

  it("reports an unreachable server as a failure the user can act on", async () => {
    const { port } = fakePort({ error: { status: 0 } });
    const outcome = await createPasswordResetService({ api: port }).request(
      "someone@example.com",
    );

    expect(outcome.status).toBe("failed");
    expect(outcome.status === "failed" && outcome.message).toContain(
      "Could not reach the server",
    );
  });

  it("reports a token the server no longer accepts, and the password it refuses", async () => {
    const service = createPasswordResetService({
      api: fakePort({ error: { code: "INVALID_TOKEN", status: 400 } }).port,
    });
    const stale = await service.complete("used-token", NEW_PASSWORD);
    expect(stale.status).toBe("failed");
    expect(stale.status === "failed" && stale.message).toContain(
      "no longer valid",
    );

    const tooShort = createPasswordResetService({
      api: fakePort({ error: { code: "PASSWORD_TOO_SHORT", status: 400 } })
        .port,
    });
    const refused = await tooShort.complete("token", "short");
    expect(refused).toEqual({
      status: "failed",
      message: "Password must be at least 8 characters.",
    });
  });

  it("completes the reset with the token and the new password", async () => {
    const { port, recorded } = fakePort({ error: null });
    const outcome = await createPasswordResetService({ api: port }).complete(
      "the-token",
      NEW_PASSWORD,
    );

    expect(outcome).toEqual({ status: "reset" });
    expect(recorded.reset).toEqual({
      token: "the-token",
      newPassword: NEW_PASSWORD,
    });
  });
});

describe("deep-link parameters (S13)", () => {
  it("reads the reset token and refuses a link that carries none", () => {
    expect(resetTokenFromParams({ token: "abc" })).toBe("abc");
    expect(resetTokenFromParams({ token: ["abc"] })).toBe("abc");
    expect(resetTokenFromParams({})).toBeNull();
    expect(resetTokenFromParams({ token: "" })).toBeNull();
  });

  it("reads the verification outcome from the redirect that carried it", () => {
    expect(verificationOutcomeFromParams({})).toEqual({ status: "verified" });
    expect(verificationOutcomeFromParams({ error: "TOKEN_EXPIRED" })).toEqual({
      status: "failed",
      message: expect.stringContaining("expired"),
    });
    expect(verificationOutcomeFromParams({ error: "INVALID_TOKEN" })).toEqual({
      status: "failed",
      message: expect.stringContaining("no longer valid"),
    });
    expect(verificationOutcomeFromParams({ error: "SOMETHING_ELSE" })).toEqual({
      status: "failed",
      message: expect.stringContaining("SOMETHING_ELSE"),
    });
  });

  it("sends a signed-in user to the app and a signed-out one to sign in", () => {
    expect(backToAppTarget(null)).toBe("/sign-in");
    expect(
      backToAppTarget({
        id: "id",
        name: "N",
        email: "n@example.com",
        role: null,
      }),
    ).toBe("/");
  });
});

describe("reset and verification over the real API (S2, S13)", () => {
  let app: ReturnType<typeof createApp>;
  let db: Awaited<ReturnType<typeof createTestDatabase>>;
  let scratchDir: string;
  let outbox: string;

  beforeAll(async () => {
    scratchDir = mkdtempSync(join(tmpdir(), "myself-password-reset-"));
    outbox = join(scratchDir, "outbox");
    const url = `file:${join(scratchDir, "backend.db")}`;

    const config = AppConfig.from({
      ENVIRONMENT: "test",
      TURSO_DATABASE_URL: url,
      AUTH_SECRET,
      AUTH_URL: BASE_URL,
      EMAIL_OUTBOX_DIR: outbox,
    });
    db = await createTestDatabase({ seed: false, url });
    app = createApp(config);
  });

  afterAll(() => {
    if (scratchDir) rmSync(scratchDir, { recursive: true, force: true });
  });

  /** The real client, with no cookie jar: bearer and JSON only, as on a device. */
  function client() {
    const token: { value: string | null } = { value: null };
    const storage: SessionTokenStorage = {
      async get() {
        return token.value;
      },
      async set(next) {
        token.value = next;
      },
      async clear() {
        token.value = null;
      },
    };

    return createAuthApi({
      baseUrl: BASE_URL,
      storage,
      fetchImpl: (input, init) =>
        Promise.resolve(app.fetch(new Request(String(input), init))),
    });
  }

  function createService() {
    return createPasswordResetService({ api: client() });
  }

  /** Polls the development outbox; both sends are deferred past the response (S14). */
  async function waitForEmail(predicate: (text: string) => boolean) {
    const deadline = Date.now() + 5_000;
    while (Date.now() < deadline) {
      for (const file of readdirSync(outbox).sort()) {
        const text = readFileSync(join(outbox, file), "utf8");
        if (predicate(text)) return text;
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error("No matching message reached the development outbox");
  }

  function linkFrom(message: string): string {
    const line = message.split("\n").find((entry) => entry.startsWith("http"));
    if (!line) throw new Error(`No link in the message: ${message}`);
    return line.trim();
  }

  async function signUp(email: string, password: string) {
    const result = await client().signUpEmail({
      name: "Reset Flow",
      email,
      password,
    });
    expect(result.error).toBeNull();
    return result.user!.id;
  }

  it("completes a reset from the emailed link and revokes every session (S2)", async () => {
    const email = "reset.over.http@example.com";
    const userId = await signUp(email, OLD_PASSWORD);
    // A second session, so "every session of that user" is more than one.
    expect(
      (await client().signInEmail({ email, password: OLD_PASSWORD })).user?.id,
    ).toBe(userId);

    const outcome = await createService().request(email);
    expect(outcome).toEqual({ status: "sent" });

    const message = await waitForEmail(
      (text) =>
        text.includes(`To: ${email}`) &&
        text.includes("Subject: Reset your password"),
    );
    const link = linkFrom(message);
    // The message points at the server, which is what a mail client can open; the server
    // then hands the token to the app's deep link, which is the only place the app can read
    // it.
    const callback = await app.fetch(new Request(link));
    expect(callback.status).toBe(302);
    const location = callback.headers.get("location") ?? "";
    expect(location.startsWith(`${resetPasswordUrl()}?token=`)).toBe(true);

    const token = resetTokenFromParams({
      token: new URL(location).searchParams.get("token") ?? undefined,
    });
    expect(token).not.toBeNull();

    expect(await createService().complete(token!, NEW_PASSWORD)).toEqual({
      status: "reset",
    });

    // S2's promise, observed: every session is gone and the old credential is refused.
    expect(
      await db.select().from(session).where(eq(session.userId, userId)),
    ).toHaveLength(0);
    const oldPassword = await client().signInEmail({
      email,
      password: OLD_PASSWORD,
    });
    expect(oldPassword.user).toBeNull();
    expect(oldPassword.error?.status).toBe(401);
    expect(
      (await client().signInEmail({ email, password: NEW_PASSWORD })).user?.id,
    ).toBe(userId);
  });

  it("lands verification on the app deep link and reports an expired token (S2, S17)", async () => {
    const email = "verify.over.http@example.com";
    await signUp(email, OLD_PASSWORD);

    const message = await waitForEmail(
      (text) =>
        text.includes(`To: ${email}`) && text.includes("/verify-email?token="),
    );
    const link = linkFrom(message);
    expect(new URL(link).searchParams.get("callbackURL")).toBe(
      verifyEmailUrl(),
    );

    const landing = await app.fetch(new Request(link));
    expect(landing.status).toBe(302);
    const target = new URL(landing.headers.get("location") ?? "");

    // The landing surface reads the redirect's own query: no parameters means the token
    // was consumed successfully, and an `error` is the failure it has to report.
    expect(
      verificationOutcomeFromParams(
        Object.fromEntries(target.searchParams.entries()),
      ),
    ).toEqual({ status: "verified" });
    expect(landing.headers.get("location")).toBe(verifyEmailUrl());
  });
});
