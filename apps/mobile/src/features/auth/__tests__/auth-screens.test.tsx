import { beforeAll, describe, expect, it, mock } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import type { SessionService } from "@/infrastructure/auth/session-service";

/**
 * The auth surfaces (S13).
 *
 * Rendered to static markup so the assertions are about what a person (and a screen
 * reader) actually gets: a persistent accessible label on every input — a placeholder
 * disappears on the first keystroke, so it cannot be the accessible name — and no
 * Google button, because S8's federated path has no native module or client IDs here.
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
function renderScreen(Screen: ScreenComponent): string {
  return renderToString(
    <SessionProvider service={unusedService}>
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

describe("sign-in screen", () => {
  it("labels the email and password inputs persistently", () => {
    const html = renderScreen(SignInScreen);
    const labels = labelledInputs(html);

    expect(labels).toContain("Email address");
    expect(labels).toContain("Password");
  });

  it("offers a submit action and a way to create an account", () => {
    const html = renderScreen(SignInScreen);

    expect(html).toContain("Sign in");
    expect(html).toContain("Create one");
    expect(html).toContain('role="link"');
  });

  it("renders no dead Google button", () => {
    const html = renderScreen(SignInScreen);

    expect(html).not.toContain("Google");
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

  it("offers a submit action and a way back to sign-in", () => {
    const html = renderScreen(SignUpScreen);

    expect(html).toContain("Create account");
    expect(html).toContain("Sign in");
    expect(html).toContain('role="link"');
  });
});
