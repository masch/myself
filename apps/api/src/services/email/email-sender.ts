/**
 * The email contract (S16).
 *
 * The vendor is undecided, so the interface is the product and every implementation is
 * a detail: one `send` call for the two messages this feature needs. The shape carries
 * what a real vendor requires beyond a body — a verified sender address (`from`, which
 * Cloudflare Email Service and Resend both reject without), a plain-text body, and an
 * HTML body for the clients that render one. Nothing here is vendor-specific: no API
 * key, no SDK type, no transport option, so swapping implementations is a one-line
 * change in the factory.
 */
export interface EmailMessage {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}

/** The inputs both messages share: who receives it and the link that carries the token. */
export interface EmailTemplateInput {
  from: string;
  user: { email: string; name?: string | null };
  url: string;
}

function greeting(name: string | null | undefined): string {
  const trimmed = typeof name === "string" ? name.trim() : "";
  return trimmed.length > 0 ? trimmed : "there";
}

function htmlBody(intro: string, url: string): string {
  return [`<p>${intro}</p>`, `<p><a href="${url}">${url}</a></p>`].join("\n");
}

/** The sign-up message (S2). */
export function verificationEmailMessage(
  input: EmailTemplateInput,
): EmailMessage {
  const name = greeting(input.user.name);
  return {
    from: input.from,
    to: input.user.email,
    subject: "Verify your email address",
    text: [
      `Hi ${name},`,
      "",
      "Confirm your email address to finish creating your account:",
      input.url,
      "",
      "If you did not create this account, you can ignore this message.",
    ].join("\n"),
    html: htmlBody(
      `Hi ${name}, confirm your email address to finish creating your account:`,
      input.url,
    ),
  };
}

/** The reset message (S2). */
export function resetPasswordMessage(input: EmailTemplateInput): EmailMessage {
  const name = greeting(input.user.name);
  return {
    from: input.from,
    to: input.user.email,
    subject: "Reset your password",
    text: [
      `Hi ${name},`,
      "",
      "Choose a new password with this link:",
      input.url,
      "",
      "If you did not ask to reset your password, ignore this message: your password stays unchanged.",
    ].join("\n"),
    html: htmlBody(
      `Hi ${name}, choose a new password with this link:`,
      input.url,
    ),
  };
}
