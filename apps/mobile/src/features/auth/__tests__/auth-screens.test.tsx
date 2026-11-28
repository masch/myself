import { beforeAll, describe, expect, it, mock } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { AppButton, ThemedText } from "@/components";
import { createHookHarness } from "@/context/__tests__/hook-harness";
import {
  AuthenticationError,
  type SessionService,
  type SessionUser,
  type SignInInput,
  type SignUpInput,
} from "@/infrastructure/auth/session-service";
import {
  GoogleSignInError,
  type GoogleIdTokenProvider,
} from "@/features/auth/google/google-id-token-provider.contract";
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

/** The identity a successful sign-up would produce. */
const SESSION_USER = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Ada Lovelace",
  email: "ada@example.com",
  role: null,
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

const { SessionProvider, useSession } =
  await import("@/context/session-context");

/**
 * What a screen may be given here: the sign-in screen's one test seam (S4). Every other
 * screen ignores it, which is what lets one type cover both.
 */
type ScreenProps = { googleProvider?: GoogleIdTokenProvider };
type ScreenComponent = React.ComponentType<ScreenProps>;
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

/**
 * The Google control (S4).
 *
 * The screen's whole job here is to ask the platform port for one ID token and hand it to
 * the same transition the email form uses, so the port is what is faked: the token a fake
 * provider hands back is the token a real one hands back. Google's own script is not
 * exercised anywhere — it only runs in a browser, after a person presses a button.
 *
 * The case above ("renders no dead Google button") stays as it was, and it is the
 * unconfigured half of the same rule: with the platform provider, which is the native one
 * in this run, nothing is configured and nothing is rendered.
 */
const GOOGLE_ID_TOKEN = "google-id-token-from-the-browser";

/** A port that hands out one token, and counts how often it was asked to. */
function fakeGoogleProvider(
  overrides: Partial<GoogleIdTokenProvider> = {},
): GoogleIdTokenProvider & { requests: () => number } {
  let requests = 0;
  return {
    available: true,
    async requestIdToken() {
      requests += 1;
      return GOOGLE_ID_TOKEN;
    },
    ...overrides,
    requests: () => requests,
  };
}

/** Every identity the session holds, as the provider renders it (oldest first). */
let sessionUsers: (SessionUser | null)[] = [];

function SessionProbe() {
  const { user } = useSession();
  sessionUsers.push(user);
  return null;
}

describe("sign-in screen and the Google control (S4)", () => {
  it("renders the control when the platform can complete it", () => {
    const html = renderToString(
      <SessionProvider service={unusedService}>
        <SignInScreen googleProvider={fakeGoogleProvider()} />
      </SessionProvider>,
    );

    // The copy a person reads, and the label a screen reader announces.
    expect(buttonLabels(html)).toEqual(["Sign in", "Continue with Google"]);
  });

  it("renders no control at all when the platform reports it cannot complete one", () => {
    const html = renderToString(
      <SessionProvider service={unusedService}>
        <SignInScreen
          googleProvider={fakeGoogleProvider({ available: false })}
        />
      </SessionProvider>,
    );

    expect(html).not.toContain("Google");
    expect(buttonLabels(html)).toEqual(["Sign in"]);
  });

  it("exchanges the provider's token for the session the screen then holds", async () => {
    const provider = fakeGoogleProvider();
    const signIns: SignInInput[] = [];
    const service: SessionService = {
      ...unusedService,
      async signIn(input) {
        signIns.push(input);
        return SESSION_USER;
      },
    };

    sessionUsers = [];
    const harness = createHookHarness();
    harness.render(
      <SessionProvider service={service}>
        <SessionProbe />
        <SignInScreen googleProvider={provider} />
      </SessionProvider>,
    );
    await harness.flush();

    const control = harness
      .components()
      .find(
        (component) =>
          component.type === AppButton &&
          component.props.title === "Continue with Google",
      );
    expect(control).toBeDefined();

    await (control!.props.onPress as () => Promise<void>)();
    await harness.flush();

    // Asked once, handed over exactly as received, and the identity it bought is the one
    // the session now renders. Nothing about this path is Google-specific.
    expect(provider.requests()).toBe(1);
    expect(signIns).toEqual([{ idToken: GOOGLE_ID_TOKEN }]);
    expect(sessionUsers.at(-1)).toEqual(SESSION_USER);
  });

  it("shows the provider's refusal and signs nobody in when no token arrives", async () => {
    const refusal = new GoogleSignInError(
      "This browser could not show the Google sign-in window. Allow third-party sign-in, or use your email and password.",
    );
    const provider = fakeGoogleProvider({
      async requestIdToken() {
        throw refusal;
      },
    });
    const signIns: SignInInput[] = [];
    const service: SessionService = {
      ...unusedService,
      async signIn(input) {
        signIns.push(input);
        return SESSION_USER;
      },
    };

    sessionUsers = [];
    const harness = createHookHarness();
    harness.render(
      <SessionProvider service={service}>
        <SessionProbe />
        <SignInScreen googleProvider={provider} />
      </SessionProvider>,
    );
    await harness.flush();

    const control = harness
      .components()
      .find(
        (component) =>
          component.type === AppButton &&
          component.props.title === "Continue with Google",
      );
    await (control!.props.onPress as () => Promise<void>)();
    await harness.flush();

    expect(errorElement(harness)).toBe(refusal.message);
    expect(signIns).toEqual([]);
    expect(provider.requests()).toBe(0);
    expect(sessionUsers.at(-1)).toBeNull();
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

  it("creates an account with exactly what the form collected (S17)", async () => {
    // S17's mobile clause: sign-up creates an account. A static render never presses
    // anything, so this drives the control a person presses and asserts what reached the
    // service — the screen's whole job is to hand the collected fields over unaltered.
    const signUps: SignUpInput[] = [];
    const recordingService: SessionService = {
      ...unusedService,
      async signUp(input) {
        signUps.push(input);
        return SESSION_USER;
      },
    };

    const harness = createHookHarness();
    harness.render(
      <SessionProvider service={recordingService}>
        <SignUpScreen />
      </SessionProvider>,
    );
    await harness.flush();

    fillField(harness, "Full name", "Ada Lovelace");
    fillField(harness, "Email address", "ada@example.com");
    fillField(harness, "Password", "a-long-enough-password");
    await harness.flush();

    const submit = harness
      .components()
      .find(
        (component) =>
          component.type === AppButton &&
          component.props.title === "Create account",
      );
    expect(submit).toBeDefined();

    await (submit!.props.onPress as () => Promise<void>)();
    await harness.flush();

    expect(signUps).toEqual([
      {
        name: "Ada Lovelace",
        email: "ada@example.com",
        password: "a-long-enough-password",
      },
    ]);
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
