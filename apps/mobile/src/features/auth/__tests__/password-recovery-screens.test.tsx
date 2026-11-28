import { beforeAll, describe, expect, it, mock } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { AppButton } from "@/components";
import { createHookHarness } from "@/context/__tests__/hook-harness";
import type { SessionService } from "@/infrastructure/auth/session-service";
import type {
  PasswordResetOutcome,
  PasswordResetRequestOutcome,
  PasswordResetService,
} from "@/infrastructure/auth/password-reset-service";
import { AuthField } from "../auth-field";

/**
 * The three surfaces of T6b (S2, S13).
 *
 * Assertions are on the control and on the message a person would read, never on the page
 * title: the forgot-password form must not claim a mail was sent when the server has no
 * sender, a reset link without a token must fail with something to press instead of a
 * dead screen, and the verification landing must report the failure the redirect carried.
 */
mock.module("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
  SafeAreaProvider: ({ children }: { children?: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
  SafeAreaView: ({ children }: { children?: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

const unusedService: SessionService = {
  async signIn() {
    throw new Error("The screens never sign in");
  },
  async signUp() {
    throw new Error("The screens never sign up");
  },
  async signOut() {},
  async restore() {
    return { status: "unauthenticated" };
  },
};

mock.module("@/infrastructure/auth/session-service-instance", () => ({
  sessionService: unusedService,
}));

// Every case below passes its own reset service; this only keeps the platform binding out
// of the screen's module graph.
mock.module("@/infrastructure/auth/password-reset-service-instance", () => ({
  passwordResetService: {
    async request() {
      throw new Error("The screens are given their own service");
    },
    async complete() {
      throw new Error("The screens are given their own service");
    },
  },
}));

const { SessionProvider } = await import("@/context/session-context");

type Params = Record<string, string | string[] | undefined>;

let ForgotPasswordScreen: React.ComponentType<{
  service?: PasswordResetService;
}>;
let ResetPasswordScreen: React.ComponentType<{
  service?: PasswordResetService;
  params?: Params;
}>;
let VerifyEmailScreen: React.ComponentType<{ params?: Params }>;

beforeAll(async () => {
  const forgot = await import("../forgot-password-screen");
  const reset = await import("../reset-password-screen");
  const verify = await import("../verify-email-screen");
  ForgotPasswordScreen = forgot.ForgotPasswordScreen;
  ResetPasswordScreen = reset.ResetPasswordScreen;
  VerifyEmailScreen = verify.VerifyEmailScreen;
});

/** Records what the screens asked the reset service to do. */
function fakeResetService(answers: {
  request?: PasswordResetRequestOutcome;
  complete?: PasswordResetOutcome;
  /** Makes the named call reject, the way a transport defect would. */
  throws?: "request" | "complete";
}) {
  const calls: {
    request: string[];
    complete: { token: string; newPassword: string }[];
  } = { request: [], complete: [] };

  const service: PasswordResetService = {
    async request(email) {
      calls.request.push(email);
      if (answers.throws === "request") throw new Error("transport exploded");
      return answers.request ?? { status: "sent" };
    },
    async complete(token, newPassword) {
      calls.complete.push({ token, newPassword });
      if (answers.throws === "complete") throw new Error("transport exploded");
      return answers.complete ?? { status: "reset" };
    },
  };

  return { service, calls };
}

function render(element: React.ReactElement): string {
  return renderToString(
    <SessionProvider service={unusedService}>{element}</SessionProvider>,
  );
}

function harnessFor(element: React.ReactElement) {
  const harness = createHookHarness();
  harness.render(
    <SessionProvider service={unusedService}>{element}</SessionProvider>,
  );
  return harness;
}

function fill(
  harness: ReturnType<typeof createHookHarness>,
  label: string,
  value: string,
) {
  const field = harness
    .components()
    .find(
      (component) =>
        component.type === AuthField && component.props.label === label,
    );
  expect(field).toBeDefined();
  (field!.props.onChangeText as (next: string) => void)(value);
}

async function press(
  harness: ReturnType<typeof createHookHarness>,
  title: string,
) {
  // Drain the field edits first: the handler closes over the state of the render that owns
  // it, so pressing before the update lands would submit the previous value.
  await harness.flush();
  const button = harness
    .components()
    .find(
      (component) =>
        component.type === AppButton && component.props.title === title,
    );
  expect(button).toBeDefined();
  await (button!.props.onPress as () => Promise<void>)();
  await harness.flush();
}

/** The text the element the screen marked with `testID` carries, or `null`. */
function textAt(harness: ReturnType<typeof createHookHarness>, testID: string) {
  const element = harness
    .components()
    .find((component) => component.props.testID === testID);
  if (!element) return null;

  const { children, title, description } = element.props;
  return [title, description, children]
    .filter((part): part is string => typeof part === "string")
    .join(" ");
}

function labelledInputs(html: string): string[] {
  return Array.from(
    html.matchAll(/aria-label="([^"]*)"/g),
    (match) => match[1],
  );
}

describe("forgot password (S2, S13)", () => {
  it("labels its input and offers the request as a control", () => {
    const { service } = fakeResetService({});
    const html = render(<ForgotPasswordScreen service={service} />);

    expect(labelledInputs(html)).toContain("Email address");
    expect(html).toContain("Send reset link");
  });

  it("asks for the reset and says nothing about whether the address exists", async () => {
    const { service, calls } = fakeResetService({
      request: { status: "sent" },
    });
    const harness = harnessFor(<ForgotPasswordScreen service={service} />);

    fill(harness, "Email address", "someone@example.com");
    await press(harness, "Send reset link");

    expect(calls.request).toEqual(["someone@example.com"]);
    const message = textAt(harness, "reset-request-sent") ?? "";
    expect(message).toContain("If an account exists");
  });

  it("reports a request that throws instead of swallowing it into a dead form", async () => {
    // The service maps every answer it can see to an outcome, so a rejection is a defect
    // rather than a case it models. Without a `catch` the press rejects with nothing
    // rendered and the person is left on a form that did nothing.
    const { service } = fakeResetService({ throws: "request" });
    const harness = harnessFor(<ForgotPasswordScreen service={service} />);

    fill(harness, "Email address", "someone@example.com");
    await press(harness, "Send reset link");

    expect(textAt(harness, "auth-error")).toBe(
      "Authentication failed. Please try again.",
    );
    expect(textAt(harness, "reset-request-sent")).toBeNull();
  });

  it("reports a server without an email sender honestly instead of as a sent mail (T4)", async () => {
    const { service } = fakeResetService({
      request: {
        status: "disabled",
        message:
          "This server cannot send email yet, so no reset link was sent. Ask the operator to configure an email sender.",
      },
    });
    const harness = harnessFor(<ForgotPasswordScreen service={service} />);

    fill(harness, "Email address", "someone@example.com");
    await press(harness, "Send reset link");

    const message = textAt(harness, "reset-request-disabled") ?? "";
    expect(message).toContain("no reset link was sent");
    expect(message.toLowerCase()).not.toContain("check your inbox");
    // The success element must be absent, not merely different.
    expect(textAt(harness, "reset-request-sent")).toBeNull();
  });

  it("refuses to ask for a malformed address", async () => {
    const { service, calls } = fakeResetService({});
    const harness = harnessFor(<ForgotPasswordScreen service={service} />);

    fill(harness, "Email address", "not-an-email");
    await press(harness, "Send reset link");

    expect(calls.request).toEqual([]);
    const field = harness
      .components()
      .find(
        (component) =>
          component.type === AuthField &&
          component.props.label === "Email address",
      );
    expect(field?.props.error).toBeTruthy();
  });
});

describe("reset password (S2, S13)", () => {
  it("fails clearly and asks nothing when the link carries no token", async () => {
    const { service, calls } = fakeResetService({});
    const harness = harnessFor(
      <ResetPasswordScreen service={service} params={{}} />,
    );

    expect(textAt(harness, "reset-link-problem")).toContain("incomplete");
    expect(calls.complete).toEqual([]);
    // Not a dead end: the way out is a control, not text.
    expect(
      harness
        .components()
        .some(
          (component) =>
            component.type === AppButton &&
            component.props.title === "Continue",
        ),
    ).toBe(true);
  });

  it("applies the project's password rules before it calls the server", async () => {
    const { service, calls } = fakeResetService({});
    const harness = harnessFor(
      <ResetPasswordScreen service={service} params={{ token: "the-token" }} />,
    );

    fill(harness, "New password", "short");
    await press(harness, "Set new password");

    expect(calls.complete).toEqual([]);
    const field = harness
      .components()
      .find(
        (component) =>
          component.type === AuthField &&
          component.props.label === "New password",
      );
    expect(field?.props.error).toBe("Password must be at least 8 characters.");
  });

  it("sets the new password with the token the link carried", async () => {
    const { service, calls } = fakeResetService({
      complete: { status: "reset" },
    });
    const harness = harnessFor(
      <ResetPasswordScreen service={service} params={{ token: "the-token" }} />,
    );

    fill(harness, "New password", "a-long-enough-password");
    await press(harness, "Set new password");

    expect(calls.complete).toEqual([
      { token: "the-token", newPassword: "a-long-enough-password" },
    ]);
    expect(textAt(harness, "reset-complete")?.toLowerCase()).toContain(
      "sign in",
    );
  });

  it("reports a completion that throws instead of leaving the link dead", async () => {
    const { service } = fakeResetService({ throws: "complete" });
    const harness = harnessFor(
      <ResetPasswordScreen service={service} params={{ token: "the-token" }} />,
    );

    fill(harness, "New password", "a-long-enough-password");
    await press(harness, "Set new password");

    expect(textAt(harness, "auth-error")).toBe(
      "Authentication failed. Please try again.",
    );
    expect(textAt(harness, "reset-complete")).toBeNull();
  });

  it("reports a token the server no longer accepts", async () => {
    const { service } = fakeResetService({
      complete: {
        status: "failed",
        message:
          "This reset link is no longer valid: it may have expired or already have been used. Request a new one.",
      },
    });
    const harness = harnessFor(
      <ResetPasswordScreen
        service={service}
        params={{ token: "used-token" }}
      />,
    );

    fill(harness, "New password", "a-long-enough-password");
    await press(harness, "Set new password");

    expect(textAt(harness, "auth-error")).toContain("no longer valid");
  });
});

describe("verification landing (S2, S13, S17)", () => {
  it("reports a verified address when the redirect carried no error", () => {
    const html = render(<VerifyEmailScreen params={{}} />);

    expect(html).toContain('data-testid="verification-outcome"');
    expect(html.toLowerCase()).toContain("verified");
    expect(html).toContain("Continue");
  });

  it("reports an expired token as a failure, never as success", () => {
    const harness = harnessFor(
      <VerifyEmailScreen params={{ error: "TOKEN_EXPIRED" }} />,
    );

    const outcome = textAt(harness, "verification-outcome") ?? "";
    expect(outcome.toLowerCase()).toContain("expired");
    expect(outcome.toLowerCase()).not.toContain("is verified");
  });

  it("reports a token that was already used", () => {
    const harness = harnessFor(
      <VerifyEmailScreen params={{ error: "INVALID_TOKEN" }} />,
    );

    expect(textAt(harness, "verification-outcome")).toContain(
      "no longer valid",
    );
  });

  it("keeps a way back into the app whatever the outcome (S17)", () => {
    for (const params of [{}, { error: "TOKEN_EXPIRED" }, { error: "X" }]) {
      const harness = harnessFor(<VerifyEmailScreen params={params} />);
      expect(
        harness
          .components()
          .some(
            (component) =>
              component.type === AppButton &&
              component.props.title === "Continue",
          ),
      ).toBe(true);
    }
  });
});
