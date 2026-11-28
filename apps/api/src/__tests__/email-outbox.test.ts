import { afterEach, describe, expect, it } from "bun:test";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resetPasswordMessage } from "../services/email/email-sender";
import {
  DevelopmentEmailSender,
  type OutboxFileSystem,
} from "../services/email/development-email-sender";

/**
 * The development outbox where it meets the real world (S16, R1-002).
 *
 * Two things went wrong here that no unit test had caught. Under `wrangler dev` — the
 * runtime `dev:turso-local` uses — there is no filesystem, so the sender threw on a
 * runtime that takes exactly the development branch `ENVIRONMENT=development` selects.
 * And the directory it wrote to was created with default permissions, so every
 * password-reset token in it was readable by any user on the machine.
 *
 * The cases below pin both: no outbox failure may escape `send`, and nothing the outbox
 * writes may be readable by anyone but its owner.
 */

const scratchDirs: string[] = [];

function scratch(): string {
  const dir = mkdtempSync(join(tmpdir(), "myself-outbox-"));
  scratchDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of scratchDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function resetMessage() {
  return resetPasswordMessage({
    from: "no-reply@myself.local",
    user: { email: "ada@example.com", name: "Ada Lovelace" },
    url: "http://localhost:8787/reset-password/token-abc123?callbackURL=",
  });
}

/** Captures both console streams around one call, so the degradation is observable. */
async function capture<T>(
  fn: () => Promise<T>,
): Promise<{ result: T; log: string[]; warn: string[] }> {
  const log: string[] = [];
  const warn: string[] = [];
  const originalLog = console.log;
  const originalWarn = console.warn;
  console.log = (...args: unknown[]) => {
    log.push(args.map((arg) => String(arg)).join(" "));
  };
  console.warn = (...args: unknown[]) => {
    warn.push(args.map((arg) => String(arg)).join(" "));
  };
  try {
    return { result: await fn(), log, warn };
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
  }
}

function modeOf(path: string): number {
  return statSync(path).mode & 0o777;
}

/** A filesystem seam that records what the sender asked it to do. */
function fakeFileSystem(
  overrides: Partial<OutboxFileSystem> & { calls?: string[] } = {},
): OutboxFileSystem & { calls: string[] } {
  const { calls = [], ...rest } = overrides;
  const fileSystem: OutboxFileSystem & { calls: string[] } = {
    calls,
    async mkdir(path: string) {
      calls.push(`mkdir ${path}`);
    },
    async writeFile(path: string) {
      calls.push(`writeFile ${path}`);
    },
    async mode() {
      return 0o700;
    },
    async chmod(path: string) {
      calls.push(`chmod ${path}`);
    },
    ...rest,
  };
  return fileSystem;
}

describe("development outbox without a filesystem (S16)", () => {
  it("prints the whole message instead of failing when no filesystem exists", async () => {
    const outbox = join(scratch(), "outbox");
    const sender = new DevelopmentEmailSender({
      environment: "test",
      outboxDir: outbox,
      loadFileSystem: async () => null,
    });

    const { result, log, warn } = await capture(() =>
      sender.send(resetMessage()),
    );

    // The request path must not fail (S2): a Worker with no filesystem still has to
    // answer the sign-up or reset request it was handling.
    expect(result).toBeUndefined();
    expect(existsSync(outbox)).toBe(false);

    // The link is the point of the message, so the whole envelope is printed.
    const printed = log.join("\n");
    expect(printed).toContain("To: ada@example.com");
    expect(printed).toContain("Subject: Reset your password");
    expect(printed).toContain("/reset-password/token-abc123");
    expect(warn.join("\n")).toContain("filesystem");
  });

  it("prints the message instead of failing when the fs module cannot be loaded", async () => {
    const outbox = join(scratch(), "outbox");
    const sender = new DevelopmentEmailSender({
      environment: "test",
      outboxDir: outbox,
      loadFileSystem: async () => {
        throw new Error('No such module "node:fs/promises".');
      },
    });

    const { result, log, warn } = await capture(() =>
      sender.send(resetMessage()),
    );

    expect(result).toBeUndefined();
    expect(existsSync(outbox)).toBe(false);
    expect(log.join("\n")).toContain("/reset-password/token-abc123");
    expect(warn.join("\n")).toContain("node:fs/promises");
  });

  it("prints the message instead of failing when the write itself fails", async () => {
    const root = scratch();
    const blocker = join(root, "not-a-directory");
    writeFileSync(blocker, "occupied");
    const outbox = join(blocker, "outbox");
    const sender = new DevelopmentEmailSender({
      environment: "test",
      outboxDir: outbox,
    });

    const { result, log, warn } = await capture(() =>
      sender.send(resetMessage()),
    );

    expect(result).toBeUndefined();
    expect(existsSync(outbox)).toBe(false);
    expect(log.join("\n")).toContain("/reset-password/token-abc123");
    expect(warn.join("\n")).toContain("unavailable");
  });
});

describe("development outbox permissions (R1-002)", () => {
  it("creates the outbox 0700 and each message file 0600", async () => {
    const outbox = join(scratch(), "outbox");
    const sender = new DevelopmentEmailSender({
      environment: "test",
      outboxDir: outbox,
    });

    await capture(() => sender.send(resetMessage()));

    // Nothing but the owner may list the outbox or open a message in it.
    expect(modeOf(outbox)).toBe(0o700);

    const files = readdirSync(outbox);
    expect(files).toHaveLength(1);
    const file = join(outbox, files[0]!);
    expect(modeOf(file)).toBe(0o600);

    // A developer still opens the file: the owner keeps read and write.
    expect(readFileSync(file, "utf8")).toContain(
      "/reset-password/token-abc123",
    );
  });

  it("tightens a pre-existing outbox other users could read, and says so", async () => {
    const outbox = join(scratch(), "outbox");
    mkdirSync(outbox);
    chmodSync(outbox, 0o755);

    const sender = new DevelopmentEmailSender({
      environment: "test",
      outboxDir: outbox,
    });
    const { warn } = await capture(() => sender.send(resetMessage()));

    expect(modeOf(outbox)).toBe(0o700);
    expect(warn.join("\n")).toContain("0o755");
    expect(warn.join("\n")).toContain("0o700");

    // The message is still written, into the directory that is now owner-only.
    const files = readdirSync(outbox);
    expect(files).toHaveLength(1);
    expect(modeOf(join(outbox, files[0]!))).toBe(0o600);
  });

  it("writes nothing into a directory it cannot restrict", async () => {
    const fileSystem = fakeFileSystem({
      async mode() {
        return 0o755;
      },
      async chmod() {
        throw new Error("EPERM: operation not permitted");
      },
    });
    const sender = new DevelopmentEmailSender({
      environment: "test",
      outboxDir: join(scratch(), "outbox"),
      loadFileSystem: async () => fileSystem,
    });

    const { result, log, warn } = await capture(() =>
      sender.send(resetMessage()),
    );

    // No message file may land in a directory that is still readable by others, so the
    // sender degrades to the console instead of accepting the loose directory.
    expect(fileSystem.calls.some((call) => call.startsWith("writeFile"))).toBe(
      false,
    );
    expect(result).toBeUndefined();
    expect(log.join("\n")).toContain("/reset-password/token-abc123");
    expect(warn.join("\n")).toContain("EPERM");
  });
});
