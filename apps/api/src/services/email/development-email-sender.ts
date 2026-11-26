import { mkdir, writeFile } from "node:fs/promises";
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

export interface DevelopmentEmailSenderOptions {
  environment: Environment;
  /** Directory the message files are written to; defaults to the system temp directory. */
  outboxDir?: string;
}

/**
 * The development implementation (S16): no vendor, no API key, nothing to configure.
 *
 * It prints the verification or reset link and writes the whole message to a file, so a
 * developer can open the link without a mail client — the same posture Cloudflare's
 * local `send_email` binding takes.
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

  constructor(options: DevelopmentEmailSenderOptions) {
    if (DEPLOYED_ENVIRONMENTS.includes(options.environment)) {
      throw new Error(
        `Refusing to use the development email sender in ENVIRONMENT="${options.environment}": it writes verification and password-reset links to a file and to the log, which would leak reset tokens in a deployed environment (S16, R1-002). Wire a production email sender before deploying.`,
      );
    }
    this.environment = options.environment;
    this.outboxDir = options.outboxDir ?? DEFAULT_EMAIL_OUTBOX_DIR;
  }

  async send(message: EmailMessage): Promise<void> {
    await mkdir(this.outboxDir, { recursive: true });

    const file = join(
      this.outboxDir,
      `${Date.now()}-${this.sequence++}-${slug(message.to)}.txt`,
    );
    await writeFile(file, render(message), "utf8");

    console.log(
      `[email] Development sender: nothing is sent. "${message.subject}" for ${message.to} is in ${file}`,
    );
    for (const line of message.text.split("\n")) {
      if (line.startsWith("http")) {
        console.log(`[email] ${line}`);
      }
    }
  }
}

/** A recipient address is not a safe file name, so everything unusual is replaced. */
function slug(value: string): string {
  return value.replace(/[^a-zA-Z0-9.@-]/g, "_");
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
