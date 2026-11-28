import { afterEach, describe, expect, it } from "bun:test";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AppConfig } from "../../config";
import type { Environment } from "../../types";
import {
  resetPasswordMessage,
  verificationEmailMessage,
} from "../email/email-sender";
import {
  DEFAULT_EMAIL_OUTBOX_DIR,
  DevelopmentEmailSender,
} from "../email/development-email-sender";
import { createEmailSender, noEmailSenderWarning } from "../email";

const scratchDirs: string[] = [];

function scratch(): string {
  const dir = mkdtempSync(join(tmpdir(), "myself-email-"));
  scratchDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of scratchDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function configFor(
  environment: Environment,
  bindings: Record<string, string> = {},
): AppConfig {
  return AppConfig.from({
    ENVIRONMENT: environment,
    TURSO_DATABASE_URL: ":memory:",
    ...bindings,
  });
}

/** Captures one console stream around a call, for both the sync and async cases. */
async function captured<T>(
  stream: "log" | "warn",
  fn: () => T | Promise<T>,
): Promise<{ result: T; lines: string[] }> {
  const original = console[stream];
  const lines: string[] = [];
  console[stream] = (...args: unknown[]) => {
    lines.push(args.map((arg) => String(arg)).join(" "));
  };
  try {
    return { result: await fn(), lines };
  } finally {
    console[stream] = original;
  }
}

function resetMessage() {
  return resetPasswordMessage({
    from: "no-reply@myself.local",
    user: { email: "ada@example.com", name: "Ada Lovelace" },
    url: "http://localhost:8787/reset-password/token-abc123?callbackURL=",
  });
}

describe("development email sender (S16, R1-002)", () => {
  it("writes the message to the outbox and logs where it went (S16)", async () => {
    const outbox = scratch();
    const sender = new DevelopmentEmailSender({
      environment: "test",
      outboxDir: outbox,
    });

    const { lines } = await captured("log", () => sender.send(resetMessage()));

    const files = readdirSync(outbox);
    expect(files).toHaveLength(1);
    const file = join(outbox, files[0]!);
    // The file is what a developer opens instead of a mail client, so it carries the
    // recipient, the subject and the link itself; S16 also asks for the link in the log.
    const written = readFileSync(file, "utf8");
    expect(written).toContain("To: ada@example.com");
    expect(written).toContain("Subject: Reset your password");
    expect(written).toContain("/reset-password/token-abc123");
    expect(lines.join("\n")).toContain(file);
    expect(lines.join("\n")).toContain("/reset-password/token-abc123");
  });

  it("refuses a deployed environment instead of writing reset tokens there (R1-002)", () => {
    // Production is the requirement; staging is refused for the same reason, because it
    // is also a deployed Worker with a real URL and no local filesystem.
    for (const environment of ["production", "staging"] as const) {
      const outbox = scratch();
      let error: Error | undefined;
      try {
        new DevelopmentEmailSender({ environment, outboxDir: outbox });
      } catch (thrown) {
        error = thrown as Error;
      }

      expect(`${environment}: ${error instanceof Error}`).toBe(
        `${environment}: true`,
      );
      expect(error!.message).toContain(`ENVIRONMENT="${environment}"`);
      expect(error!.message).toContain("reset tokens");
      // Construction is the guard, so nothing was created before the refusal.
      expect(readdirSync(outbox)).toEqual([]);
    }
  });

  it("defaults the outbox outside the worktree and serves the local environments", () => {
    expect(
      new DevelopmentEmailSender({ environment: "development" }).outboxDir,
    ).toBe(DEFAULT_EMAIL_OUTBOX_DIR);
    expect(DEFAULT_EMAIL_OUTBOX_DIR.startsWith(tmpdir())).toBe(true);

    for (const environment of ["development", "test"] as const) {
      expect(createEmailSender(configFor(environment))).toBeInstanceOf(
        DevelopmentEmailSender,
      );
    }
  });

  it("wires no development sender in a deployed environment and says so once (R1-002)", async () => {
    // Built first: a deployed config also warns about its empty CORS allowlist, and this
    // case is about the sender's one warning.
    const config = configFor("production", { AUTH_SECRET: "unit-test" });
    const { result: sender, lines } = await captured("warn", () =>
      createEmailSender(config),
    );

    expect(sender).toBeUndefined();
    expect(lines).toEqual([noEmailSenderWarning("production")]);
    expect(lines[0]).toContain('ENVIRONMENT="production"');
    // A link or a token in this warning is exactly the leak the refusal prevents.
    expect(lines[0]).not.toContain("token=");
    expect(lines[0]).not.toContain("/reset-password/");
  });
});

describe("email messages (S2)", () => {
  it("escapes the user's name and the link out of the HTML body", () => {
    // The name is whatever the person typed at sign-up, and this body is HTML a mail
    // client renders: interpolated raw, it is an injection into the message. The link is
    // ours, but its query separators still need escaping, or an `&` opens an entity.
    const message = verificationEmailMessage({
      from: "no-reply@myself.local",
      user: {
        email: "ada@example.com",
        name: `<img src=x onerror="alert(1)"> O'Brien & Sons`,
      },
      url: "http://localhost:8787/verify-email?token=a&callbackURL=myself://verify-email",
    });

    expect(message.html).not.toContain("<img");
    expect(message.html).toContain("&lt;img");
    expect(message.html).toContain("O&#39;Brien &amp; Sons");
    expect(message.html).toContain("token=a&amp;callbackURL=");

    // The plain-text alternative is not HTML, so the name stays exactly as typed there.
    expect(message.text).toContain("<img");
  });

  it("gives both messages an HTML body that carries the link", () => {
    // Vendors deliver HTML, so the plain-text link alone is not enough; the text and the
    // subject are already observed end to end by the flows suite, through the file the
    // development sender writes.
    expect(resetMessage().html).toContain("/reset-password/token-abc123");
    expect(
      verificationEmailMessage({
        from: "no-reply@myself.local",
        user: { email: "grace@example.com", name: "Grace Hopper" },
        url: "http://localhost:8787/verify-email?token=verify123",
      }).html,
    ).toContain("token=verify123");
  });
});

describe("email configuration (S16)", () => {
  it("defaults the sender address, leaves the outbox to the sender and trims overrides", () => {
    expect(configFor("test").email).toEqual({
      from: "no-reply@myself.local",
      outboxDir: undefined,
    });

    const overridden = configFor("test", {
      EMAIL_FROM: "  readings@myself.example  ",
      EMAIL_OUTBOX_DIR: "  /tmp/custom-outbox  ",
    });
    expect(overridden.email.from).toBe("readings@myself.example");
    expect(overridden.email.outboxDir).toBe("/tmp/custom-outbox");
  });
});
