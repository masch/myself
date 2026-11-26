import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import {
  ADMIN_ROLE,
  ADMIN_USER_EMAIL,
  ADMIN_USER_ID,
  session,
  user,
} from "@myself/shared";
import { createApp } from "../../app";
import { createAuth } from "../../auth";
import { AppConfig } from "../../config";
import {
  createDb,
  type DbClient,
} from "../../infrastructure/persistence/client";
import { seedFromConfig } from "../../infrastructure/persistence/seed";

const AUTH_SECRET = "dGhpcy1pcy1hLXRlc3Qtc2VjcmV0LWZvci1lbWFpbC1mbG93cw==";

/** Deployment configuration (R1-001), so this suite supplies its own admin value. */
const ADMIN_TEST_PASSWORD = "email-suite-admin-password";
const OLD_PASSWORD = "old-password-before-reset";
const NEW_PASSWORD = "new-password-after-reset";

function jsonRequest(path: string, body: unknown, token?: string): Request {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function tokenFrom(message: string, pattern: RegExp): string {
  const match = message.match(pattern);
  if (!match?.[1]) {
    throw new Error(`No token in the message: ${message}`);
  }
  return match[1];
}

/** Captures `console.warn` around a factory call, for the production wiring case. */
function warningsWhile<T>(fn: () => T): { result: T; warnings: string[] } {
  const original = console.warn;
  const warnings: string[] = [];
  console.warn = (...args: unknown[]) => {
    warnings.push(args.map((arg) => String(arg)).join(" "));
  };
  try {
    return { result: fn(), warnings };
  } finally {
    console.warn = original;
  }
}

describe("email flows over HTTP (S2, S16)", () => {
  let app: ReturnType<typeof createApp>;
  let db: DbClient;
  let cleanup: () => void;
  let outbox: string;

  beforeAll(async () => {
    const dir = mkdtempSync(join(tmpdir(), "myself-email-flows-"));
    cleanup = () => rmSync(dir, { recursive: true, force: true });
    outbox = join(dir, "outbox");
    // The sender creates its outbox on the first send; creating it here keeps the poll
    // below from racing that first `mkdir`.
    mkdirSync(outbox, { recursive: true });

    const config = AppConfig.from({
      ENVIRONMENT: "test",
      TURSO_DATABASE_URL: `file:${join(dir, "email.db")}`,
      AUTH_SECRET,
      AUTH_URL: "http://localhost:8787",
      ADMIN_USER_PASSWORD: ADMIN_TEST_PASSWORD,
      EMAIL_OUTBOX_DIR: outbox,
    });
    await seedFromConfig(config);
    db = createDb({ url: config.database.url });
    app = createApp(config);
  });

  afterAll(() => {
    cleanup();
  });

  /**
   * Reads the development outbox until a message matches. Both sends are handed to
   * Better Auth's background dispatcher (`advanced.backgroundTasks`, S14), so they
   * settle after the response; polling is how the deferral is observed, not assumed.
   */
  async function waitForEmail(
    predicate: (text: string) => boolean,
  ): Promise<string> {
    const deadline = Date.now() + 5_000;
    while (Date.now() < deadline) {
      for (const file of readdirSync(outbox).sort()) {
        const text = readFileSync(join(outbox, file), "utf8");
        if (predicate(text)) {
          return text;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error("No matching message reached the development outbox");
  }

  function post(path: string, body: unknown, token?: string) {
    return app.request(jsonRequest(path, body, token));
  }

  async function signIn(email: string, password: string) {
    return post("/api/auth/sign-in/email", { email, password });
  }

  async function sessionsOf(userId: string) {
    return db.select().from(session).where(eq(session.userId, userId));
  }

  it("wires both callbacks and the reset revocation, and none of them in a deployment (S2, S16, R1-002)", () => {
    const local = createAuth(
      AppConfig.from({
        ENVIRONMENT: "test",
        TURSO_DATABASE_URL: ":memory:",
        AUTH_SECRET,
      }),
    ).options;

    expect(typeof local.emailVerification?.sendVerificationEmail).toBe(
      "function",
    );
    // `requireEmailVerification` stays off (S23); `sendOnSignUp` is what still sends the
    // message, because the library defaults it to the enforcement flag.
    expect(local.emailVerification?.sendOnSignUp).toBe(true);
    expect(
      (local.emailAndPassword as { requireEmailVerification?: boolean })
        .requireEmailVerification,
    ).toBeUndefined();
    expect(typeof local.emailAndPassword?.sendResetPassword).toBe("function");
    expect(local.emailAndPassword?.revokeSessionsOnPasswordReset).toBe(true);

    const production = warningsWhile(() =>
      createAuth(
        AppConfig.from({
          ENVIRONMENT: "production",
          TURSO_DATABASE_URL: ":memory:",
          AUTH_SECRET,
        }),
      ),
    );
    expect(production.result.options.emailVerification).toBeUndefined();
    expect(
      production.result.options.emailAndPassword?.sendResetPassword,
    ).toBeUndefined();
    // Revocation is a property of the reset flow, not of the sender: it stays on.
    expect(
      production.result.options.emailAndPassword?.revokeSessionsOnPasswordReset,
    ).toBe(true);
    expect(
      production.warnings.filter((line) => line.includes("[email]")),
    ).toHaveLength(1);
  });

  it("sends a verification message on sign-up whose token the endpoint accepts (S2)", async () => {
    const signUp = await post("/api/auth/sign-up/email", {
      email: "verify.me@example.com",
      password: "a-long-enough-password",
      name: "Verify Me",
    });
    expect(signUp.status).toBe(200);
    const created = (await signUp.json()) as { user: { id: string } };
    // S23: a message is sent, but a verified address is not required to sign in, so the
    // response still carries a live session.
    expect(typeof signUp.headers.get("set-auth-token")).toBe("string");

    const message = await waitForEmail(
      (text) =>
        text.includes("To: verify.me@example.com") &&
        text.includes("/verify-email?token="),
    );
    expect(message).toContain("Subject: Verify your email address");

    const token = tokenFrom(message, /verify-email\?token=([^&\s]+)/);
    const verified = await app.request(
      `/api/auth/verify-email?token=${encodeURIComponent(token)}`,
    );
    expect(verified.status).toBe(200);

    const [row] = await db
      .select()
      .from(user)
      .where(eq(user.id, created.user.id));
    expect(row.emailVerified).toBe(true);
  });

  it("completes a reset, revokes every session and rejects the old password (S2)", async () => {
    const email = "reset.me@example.com";
    const signUp = await post("/api/auth/sign-up/email", {
      email,
      password: OLD_PASSWORD,
      name: "Reset Me",
    });
    expect(signUp.status).toBe(200);
    const created = (await signUp.json()) as { user: { id: string } };

    // A second session, so "every session" is more than the one that asked.
    expect((await signIn(email, OLD_PASSWORD)).status).toBe(200);
    expect(await sessionsOf(created.user.id)).toHaveLength(2);

    expect(
      (
        await app.request(
          jsonRequest("/api/auth/request-password-reset", { email }),
        )
      ).status,
    ).toBe(200);

    const message = await waitForEmail(
      (text) =>
        text.includes("To: reset.me@example.com") &&
        text.includes("Subject: Reset your password"),
    );
    const reset = await post("/api/auth/reset-password", {
      newPassword: NEW_PASSWORD,
      token: tokenFrom(message, /\/reset-password\/([^?\s]+)/),
    });
    expect(reset.status).toBe(200);

    expect(await sessionsOf(created.user.id)).toHaveLength(0);
    // The bearer token the client stored no longer resolves a session either.
    const stale = await app.request(
      new Request("http://localhost/api/auth/get-session", {
        headers: {
          authorization: `Bearer ${signUp.headers.get("set-auth-token")}`,
        },
      }),
    );
    expect(await stale.json()).toBeNull();

    expect((await signIn(email, OLD_PASSWORD)).status).toBe(401);
    expect((await signIn(email, NEW_PASSWORD)).status).toBe(200);
  });

  it("rotates the seeded admin credential through the reset flow (L21, T4)", async () => {
    const rotated = "rotated-admin-password";

    // An existing admin session is exactly what a rotation must invalidate.
    expect((await signIn(ADMIN_USER_EMAIL, ADMIN_TEST_PASSWORD)).status).toBe(
      200,
    );
    expect((await sessionsOf(ADMIN_USER_ID)).length).toBeGreaterThan(0);

    expect(
      (
        await app.request(
          jsonRequest("/api/auth/request-password-reset", {
            email: ADMIN_USER_EMAIL,
          }),
        )
      ).status,
    ).toBe(200);

    const message = await waitForEmail(
      (text) =>
        text.includes(`To: ${ADMIN_USER_EMAIL}`) &&
        text.includes("Subject: Reset your password"),
    );
    expect(
      (
        await app.request(
          jsonRequest("/api/auth/reset-password", {
            newPassword: rotated,
            token: tokenFrom(message, /\/reset-password\/([^?\s]+)/),
          }),
        )
      ).status,
    ).toBe(200);

    // The seed does not overwrite a credential (L21); rotation is this flow's job. The
    // new password works, the old one is rejected, and the admin keeps its role.
    expect(await sessionsOf(ADMIN_USER_ID)).toHaveLength(0);
    expect((await signIn(ADMIN_USER_EMAIL, ADMIN_TEST_PASSWORD)).status).toBe(
      401,
    );
    const rotatedSignIn = await signIn(ADMIN_USER_EMAIL, rotated);
    expect(rotatedSignIn.status).toBe(200);
    const body = (await rotatedSignIn.json()) as {
      user: { id: string; role?: string };
    };
    expect(body.user.id).toBe(ADMIN_USER_ID);
    expect(body.user.role).toBe(ADMIN_ROLE);
  });
});
