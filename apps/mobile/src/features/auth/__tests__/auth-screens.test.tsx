import { beforeAll, describe, expect, it, mock } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { AppButton, ThemedText } from "@/components";
import { createHookHarness } from "@/context/__tests__/hook-harness";
import {
  AuthenticationError,
  type SessionService,
} from "@/infrastructure/auth/session-service";
import { AuthField } from "../auth-field";

/**
 * The auth surfaces (S13, T6c `m4`).
 *
 * Two kinds of assertion, and the split matters. Static markup is about what a person (and
 * a screen reader) gets: a persistent accessible label on every input — a placeholder
 * disappears on the first keystroke, so it cannot be the accessible name — the submit
 * control itself (a `role="button"` carrying the action's label, not a string the page
 * title already satisfies), and no Google button, because S8's federated path has no
 * native module or client IDs here. Behaviour is driven through the hook harness, because
 * a static render never runs an event handler: a sign-in the service rejects has to reach
 * the error element.
 */
mock.module("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
  SafeAreaProvider: ({ children }: { children?: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
  SafeAreaView: ({ children }: { children?: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

// The screens read their transitions from the real session provider, which binds the
// platform token store on import; only that binding is replaced here. Mocking
// `@/context/session-context` itself would hide the provider from every other test file
// in the run, because Bun registers module mocks for the whole run.
const unusedService: SessionService = {
  async signIn() {
    throw new Error("The static render never signs in");
  },
  async signUp() {
    throw new Error("The static render never signs up");
  },
  async signOut() {},
  async restore() {
    return { status: "unauthenticated" };
  },
};

/** A service whose sign-in always fails the way an invalid password does. */
const rejectingService: SessionService = {
  ...unusedService,
  async signIn() {
    throw new AuthenticationError("Email or password is incorrect.");
  },
};

mock.module("@/infrastructure/auth/session-service-instance", () => ({
  sessionService: unusedService,
}));

const { SessionProvider } = await import("@/context/session-context");

type ScreenComponent = React.ComponentType<Record<string, never>>;
let SignInScreen: ScreenComponent;
let SignUpScreen: ScreenComponent;

beforeAll(async () => {
  const signIn = await import("../sign-in-screen");
  const signUp = await import("../sign-up-screen");
  SignInScreen = signIn.SignInScreen;
  SignUpScreen = signUp.SignUpScreen;
});

/** Renders a screen with the session it reads, exactly as the root stack does. */
function renderScreen(
  Screen: ScreenComponent,
  service: SessionService = unusedService,
): string {
  return renderToString(
    <SessionProvider service={service}>
      <Screen />
    </SessionProvider>,
  );
}

function labelledInputs(html: string): string[] {
  return Array.from(
    html.matchAll(/aria-label="([^"]*)"/g),
    (match) => match[1],
  );
}

/**
 * The accessible names of `role="button"` elements, i.e. of the controls a person can
 * press. A page title is not one of these, which is what makes the assertion non-tautological.
 */
function buttonLabels(html: string): string[] {
  const labels: string[] = [];
  for (const tag of html.matchAll(/<[a-zA-Z][^>]*role="button"[^>]*>/g)) {
    const label = /aria-label="([^"]*)"/.exec(tag[0]);
    if (label) labels.push(label[1]);
  }
  return labels;
}

describe("sign-in screen", () => {
  it("labels the email and password inputs persistently", () => {
    const html = renderScreen(SignInScreen);
    const labels = labelledInputs(html);

    expect(labels).toContain("Email address");
    expect(labels).toContain("Password");
  });

  it("renders the submit control itself, not just the page title", () => {
    const html = renderScreen(SignInScreen);

    // "Sign in" alone proves nothing: the page title contains it. The control is a button
    // whose accessible name is the action.
    expect(buttonLabels(html)).toEqual(["Sign in"]);
    expect(html).toContain("Create one");
    expect(html).toContain('role="link"');
  });

  it("renders no dead Google button", () => {
    const html = renderScreen(SignInScreen);

    expect(html).not.toContain("Google");
  });

  it("shows the error element when the service rejects the sign-in", async () => {
    const harness = createHookHarness();
    harness.render(
      <SessionProvider service={rejectingService}>
        <SignInScreen />
      </SessionProvider>,
    );
    await harness.flush();

    fillField(harness, "Email address", "myself@example.com");
    fillField(harness, "Password", "not-the-password");
    await harness.flush();

    const submit = harness
      .components()
      .find(
        (component) =>
          component.type === AppButton && component.props.title === "Sign in",
      );
    expect(submit).toBeDefined();

    await (submit!.props.onPress as () => Promise<void>)();
    await harness.flush();

    expect(errorElement(harness)).toBe("Email or password is incorrect.");
  });
});

describe("sign-up screen", () => {
  it("labels the name, email and password inputs persistently", () => {
    const html = renderScreen(SignUpScreen);
    const labels = labelledInputs(html);

    expect(labels).toContain("Full name");
    expect(labels).toContain("Email address");
    expect(labels).toContain("Password");
  });

  it("renders the submit control itself, not just the page title", () => {
    const html = renderScreen(SignUpScreen);

    // The title and the button share the text on purpose, so the assertion is on the
    // control: a page with no submit button must fail here.
    expect(buttonLabels(html)).toEqual(["Create account"]);
    expect(html).toContain("Sign in");
    expect(html).toContain('role="link"');
  });
});

/** Types into the field the screen labelled `label`, as a person would. */
function fillField(
  harness: ReturnType<typeof createHookHarness>,
  label: string,
  value: string,
): void {
  const field = harness
    .components()
    .find(
      (component) =>
        component.type === AuthField && component.props.label === label,
    );
  expect(field).toBeDefined();
  (field!.props.onChangeText as (next: string) => void)(value);
}

/** The text of the screen's error element, or `null` when it is not rendered. */
function errorElement(
  harness: ReturnType<typeof createHookHarness>,
): string | null {
  const element = harness
    .components()
    .find(
      (component) =>
        component.type === ThemedText &&
        component.props.testID === "auth-error",
    );
  return element ? String(element.props.children) : null;
}
