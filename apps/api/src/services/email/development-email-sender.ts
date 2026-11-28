import { tmpdir } from "node:os";
import { join } from "node:path";
import { DEPLOYED_ENVIRONMENTS } from "../../config";
import { type Environment } from "../../types";
import type { EmailMessage, EmailSender } from "./email-sender";

/**
 * Where the development sender drops messages when nothing is configured.
 *
 * Outside the worktree on purpose: a message file is scratch, and the repository must
 * never carry a reset token. It is the system temp directory, so it is wiped by the
 * operating system and it is never mistaken for application data.
 */
export const DEFAULT_EMAIL_OUTBOX_DIR = join(tmpdir(), "myself-emails");

/**
 * Owner-only, because every message carries a live single-use credential (R1-002).
 *
 * `0700` on the directory and `0600` on the file mean only the account that runs the API
 * can list the outbox or open a message; the owner keeps read and write, so a developer
 * can still open the file with an editor or `cat`.
 */
const OUTBOX_DIR_MODE = 0o700;
const OUTBOX_FILE_MODE = 0o600;

/** Permission bits that let anyone but the owner in: group and other. */
const NOT_OWNER_ONLY = 0o077;

/**
 * The few filesystem operations the outbox needs, with the permissions baked in.
 *
 * A seam rather than direct `node:fs` calls, because the module this sender runs in is
 * also bundled for the Worker: under `wrangler dev` there is no filesystem at all, so the
 * only way to observe that path is to be able to hand the sender a filesystem that is
 * absent, or that fails the way a read-only one does.
 */
export interface OutboxFileSystem {
  /** Creates the directory with `0700` when it is missing; leaves an existing one as is. */
  mkdir(path: string): Promise<void>;
  /** Writes one message file with `0600`, then makes those bits exact. */
  writeFile(path: string, contents: string): Promise<void>;
  /** The permission bits of a path. */
  mode(path: string): Promise<number>;
  /** Changes the permission bits of a path. */
  chmod(path: string, mode: number): Promise<void>;
}

/**
 * Resolves the filesystem, or `null` when the runtime has none.
 *
 * Loaded on demand instead of imported at the top of this module: `wrangler dev` (the
 * runtime `dev:turso-local` uses) runs the development sender with `ENVIRONMENT=
 * development`, and it has no filesystem. A static import would make the module graph
 * depend on that working; a runtime load lets the send degrade instead of failing the
 * request that triggered it.
 */
export type OutboxFileSystemLoader = () => Promise<OutboxFileSystem | null>;

const loadNodeFileSystem: OutboxFileSystemLoader = async () => {
  const fs = await import("node:fs/promises");
  return {
    async mkdir(path) {
      await fs.mkdir(path, { recursive: true, mode: OUTBOX_DIR_MODE });
    },
    async writeFile(path, contents) {
      // The mode is applied at creation, so the file is never briefly world-readable, and
      // again afterwards, so the umask cannot leave it looser than `0600`.
      await fs.writeFile(path, contents, {
        encoding: "utf8",
        mode: OUTBOX_FILE_MODE,
      });
      await fs.chmod(path, OUTBOX_FILE_MODE);
    },
    async mode(path) {
      return (await fs.stat(path)).mode;
    },
    async chmod(path, mode) {
      await fs.chmod(path, mode);
    },
  };
};

/** Where a message ended up, or why it did not. */
type OutboxOutcome =
  { written: true; file: string } | { written: false; reason: string };

export interface DevelopmentEmailSenderOptions {
  environment: Environment;
  /** Directory the message files are written to; defaults to the system temp directory. */
  outboxDir?: string;
  /** Test seam: supply a filesystem, or `null` to act as a runtime without one. */
  loadFileSystem?: OutboxFileSystemLoader;
}

/**
 * The development implementation (S16): no vendor, no API key, nothing to configure.
 *
 * It prints the verification or reset link and writes the whole message to a file, so a
 * developer can open the link without a mail client — the same posture Cloudflare's
 * local `send_email` binding takes. When there is no filesystem it prints the whole
 * message instead and returns normally: `wrangler dev` takes this branch, and a missing
 * outbox may never fail a sign-up or a password-reset request.
 *
 * It **refuses to exist in a deployed environment** (R1-002). Both messages carry a
 * live single-use credential in their link, and a log line or a file is not a delivery
 * channel: in production this sender would leak reset tokens to anyone reading the
 * Worker's logs, which is a credential leak, not a convenience. The refusal is at
 * construction so the failure is loud at the first use of the sender, not on the first
 * password reset. `DEPLOYED_ENVIRONMENTS` covers staging as well as production: both
 * run as a deployed Worker with a publicly reachable URL and no local filesystem, so a
 * message "written to disk" there would be lost, and logged tokens are just as exposed.
 */
export class DevelopmentEmailSender implements EmailSender {
  readonly environment: Environment;
  readonly outboxDir: string;
  private sequence = 0;
  private readonly loadFileSystem: OutboxFileSystemLoader;
  /**
   * Prepared once per sender: the directory geometry does not change under it, and a
   * memoised promise keeps two concurrent sends from racing on the same `mkdir`/`chmod`.
   */
  private outboxReady: Promise<void> | null = null;

  constructor(options: DevelopmentEmailSenderOptions) {
    if (DEPLOYED_ENVIRONMENTS.includes(options.environment)) {
      throw new Error(
        `Refusing to use the development email sender in ENVIRONMENT="${options.environment}": it writes verification and password-reset links to a file and to the log, which would leak reset tokens in a deployed environment (S16, R1-002). Wire a production email sender before deploying.`,
      );
    }
    this.environment = options.environment;
    this.outboxDir = options.outboxDir ?? DEFAULT_EMAIL_OUTBOX_DIR;
    this.loadFileSystem = options.loadFileSystem ?? loadNodeFileSystem;
  }

  async send(message: EmailMessage): Promise<void> {
    const outcome = await this.writeToOutbox(message);

    if (outcome.written) {
      console.log(
        `[email] Development sender: nothing is sent. "${message.subject}" for ${message.to} is in ${outcome.file}`,
      );
      for (const line of message.text.split("\n")) {
        if (line.startsWith("http")) {
          console.log(`[email] ${line}`);
        }
      }
      return;
    }

    // No outbox: print the whole message, envelope included, because the link inside it is
    // the only delivery channel left. `warn`, not `log`, so the missing outbox is visible.
    console.warn(
      `[email] Development sender: the outbox at ${this.outboxDir} is unavailable (${outcome.reason}), so the message is printed instead. Nothing is delivered either way.`,
    );
    for (const line of render(message).split("\n")) {
      console.log(`[email] ${line}`);
    }
  }

  /**
   * Writes one message file, or explains why it did not.
   *
   * Every failure is turned into an outcome instead of being thrown: a filesystem that
   * does not exist, a module that cannot be loaded, a read-only or full disk. The one
   * caller is Better Auth's background task, but the request that scheduled it is the
   * user's sign-up or reset, and that request must not fail because the scratch outbox
   * is unavailable.
   */
  private async writeToOutbox(message: EmailMessage): Promise<OutboxOutcome> {
    try {
      const fileSystem = await this.loadFileSystem();
      if (!fileSystem) {
        return {
          written: false,
          reason: "this runtime has no filesystem, as is the case for a Worker",
        };
      }

      await this.prepareOutbox(fileSystem);

      const file = join(
        this.outboxDir,
        `${Date.now()}-${this.sequence++}-${slug(message.to)}.txt`,
      );
      await fileSystem.writeFile(file, render(message));
      return { written: true, file };
    } catch (error) {
      return { written: false, reason: reasonOf(error) };
    }
  }

  /**
   * Creates the outbox, and refuses to accept one other users can read.
   *
   * `mkdir` applies its mode only when it creates the directory, so a pre-existing
   * outbox — a developer's `mkdir`, or one created by an older build with default
   * permissions — would keep whatever bits it had and every token in it would stay
   * world-readable. It is tightened here instead, loudly, and if it cannot be tightened
   * the send fails over to the console rather than writing a credential into it.
   */
  private async prepareOutbox(fileSystem: OutboxFileSystem): Promise<void> {
    this.outboxReady ??= this.ensureOutbox(fileSystem).catch(
      (error: unknown) => {
        // A later send may retry: the developer can fix the directory without restarting.
        this.outboxReady = null;
        throw error;
      },
    );

    await this.outboxReady;
  }

  private async ensureOutbox(fileSystem: OutboxFileSystem): Promise<void> {
    await fileSystem.mkdir(this.outboxDir);

    const mode = await fileSystem.mode(this.outboxDir);
    if ((mode & NOT_OWNER_ONLY) === 0) return;

    console.warn(
      `[email] Development sender: ${this.outboxDir} was readable by other users (mode ${octal(mode)}); setting it to ${octal(OUTBOX_DIR_MODE)} so reset tokens are owner-only.`,
    );
    await fileSystem.chmod(this.outboxDir, OUTBOX_DIR_MODE);

    const tightened = await fileSystem.mode(this.outboxDir);
    if ((tightened & NOT_OWNER_ONLY) !== 0) {
      throw new Error(
        `${this.outboxDir} could not be restricted to ${octal(OUTBOX_DIR_MODE)} (still ${octal(tightened)}), so no message was written there`,
      );
    }
  }
}

/** A recipient address is not a safe file name, so everything unusual is replaced. */
function slug(value: string): string {
  return value.replace(/[^a-zA-Z0-9.@-]/g, "_");
}

/** Permission bits as the octal a developer can compare with `ls -l`. */
function octal(mode: number): string {
  return `0o${(mode & 0o777).toString(8).padStart(3, "0")}`;
}

/** The sentence of a failure, without a stack: this ends up on one log line. */
function reasonOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** The file a developer opens: the envelope, then exactly the text body. */
function render(message: EmailMessage): string {
  return [
    `From: ${message.from}`,
    `To: ${message.to}`,
    `Subject: ${message.subject}`,
    `Date: ${new Date().toISOString()}`,
    "",
    message.text,
    "",
  ].join("\n");
}
