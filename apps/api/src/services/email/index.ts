import { DEPLOYED_ENVIRONMENTS, type AppConfig } from "../../config";
import { DevelopmentEmailSender } from "./development-email-sender";
import type { EmailSender } from "./email-sender";

export * from "./email-sender";
export * from "./development-email-sender";

/**
 * What a deployment without a real sender prints once at boot (S16, R1-002).
 *
 * One line, not one per request, and it never carries a link or a token: the whole
 * point of the refusal is that a deployed environment must not see reset tokens it
 * cannot deliver.
 */
export function noEmailSenderWarning(environment: string): string {
  return (
    `[email] No email sender is configured for ENVIRONMENT="${environment}": ` +
    "the development sender refuses to run in a deployed environment because it " +
    "writes verification and reset links to a file and to the log (S16, R1-002). " +
    "Verification and password-reset email are disabled until a production vendor is wired."
  );
}

/**
 * The one place the sender is chosen (S16).
 *
 * Development and test get the development sender; a deployed environment gets no
 * sender at all and one boot warning, because the only implementation that exists
 * refuses to run there. Consequence, stated plainly rather than hidden: a deployed
 * environment boots and serves reads, sign-up and sign-in, but its verification and
 * password-reset email are disabled until a real vendor is wired into this factory.
 * `revokeSessionsOnPasswordReset` stays on regardless, because it is a property of the
 * reset flow and not of the sender.
 */
export function createEmailSender(config: AppConfig): EmailSender | undefined {
  if (DEPLOYED_ENVIRONMENTS.includes(config.environment)) {
    console.warn(noEmailSenderWarning(config.environment));
    return undefined;
  }

  return new DevelopmentEmailSender({
    environment: config.environment,
    outboxDir: config.email.outboxDir,
  });
}
