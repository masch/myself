import { describe, expect, it, mock } from "bun:test";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createHookHarness } from "@/context/__tests__/hook-harness";
import type {
  SessionRevoke,
  SessionService,
  SessionUser,
} from "@/infrastructure/auth/session-service";

/**
 * Sign-out on the settings screen (T2, S3, S5).
 *
 * S5 asks for the sign-out rule to be pinned through the surface a person uses, so these
 * cases press the control the screen renders rather than calling the sequence function:
 * a sign-out the server did not end has to read as "your session may still be active" on
 * the screen, with one control that asks again, and a sign-out the server did end must be
 * left exactly as ordinary as it was. A static render cannot press anything and never runs
 * the state the answer lands in, so the screen is driven through the hook harness.
 */
mock.module("expo-sqlite", () => ({
  useSQLiteContext: () => ({}),
  SQLiteProvider: ({ children }: { children?: React.ReactNode }) => children,
}));

const USER: SessionUser = {
  id: "e0000000-0000-4000-8000-000000000001",
  name: "My self",
  email: "myself@example.com",
  role: "user",
};

const unusedService: SessionService = {
  async signIn() {
    return USER;
  },
  async signUp() {
    return USER;
  },
  async signOut() {},
  async restore() {
    return { status: "authenticated", user: USER };
  },
};

// The screen reads its transitions from the real session provider, which binds the
// platform token store on import; only that binding is replaced here. Mocking
// `@/context/session-context` itself would hide the provider from every other test file in
// the run, because Bun registers module mocks for the whole run.
mock.module("@/infrastructure/auth/session-service-instance", () => ({
  sessionService: unusedService,
}));

const { SessionProvider, useSession } =
  await import("@/context/session-context");
type SessionContextValue = ReturnType<typeof useSession>;
const { ChipButton, ThemedText } = await import("@/components");
const { default: SettingsScreen } = await import("../(tabs)/settings");

/**
 * A service whose revokes are scripted, so each press sees the answer the test chose.
 *
 * `signOut` also counts its calls: the retry case is only proven if the second press
 * actually asked the service again.
 */
function createService(revokes: (SessionRevoke | void)[]) {
  const pending = [...revokes];
  const calls = { signOut: 0 };
  const service: SessionService = {
    async signIn() {
      return USER;
    },
    async signUp() {
      return USER;
    },
    async signOut() {
      calls.signOut += 1;
      return pending.shift();
    },
    async restore() {
      return { status: "authenticated", user: USER };
    },
  };
  return { service, calls };
}

/**
 * Reads the identity the provider publishes, the way any signed-in screen reads it.
 *
 * The screen's own state and the provider's decision are two different answers, and the
 * cases below need both at once: telling the truth about the server session is not the
 * same decision as staying signed in.
 */
function createProbe() {
  const seen: SessionContextValue[] = [];
  function Probe() {
    seen.push(useSession());
    return null;
  }
  return {
    Probe,
    user: (): SessionUser | null => seen[seen.length - 1]?.user ?? null,
  };
}

/** Renders the screen with the session and the query cache it reads, as the app does. */
function renderSettings(service: SessionService) {
  const harness = createHookHarness();
  const queryClient = new QueryClient();
  const probe = createProbe();
  const { Probe } = probe;

  harness.render(
    <QueryClientProvider client={queryClient}>
      <SessionProvider service={service}>
        <Probe />
        <SettingsScreen />
      </SessionProvider>
    </QueryClientProvider>,
  );

  return { harness, queryClient, probe };
}

/** The control a person presses, found by the label the screen renders on it. */
function pressable(
  harness: ReturnType<typeof createHookHarness>,
  title: string,
) {
  const control = harness
    .components()
    .find(
      (component) =>
        component.type === ChipButton && component.props.title === title,
    );
  expect(control).toBeDefined();
  return control!;
}

/** Presses the control labelled `title`, as a person would, and settles the answer. */
async function press(
  harness: ReturnType<typeof createHookHarness>,
  title: string,
): Promise<void> {
  const control = pressable(harness, title);
  await (control.props.onPress as () => Promise<void>)();
  await harness.flush();
}

/** Every label the screen currently offers as a control. */
function titles(harness: ReturnType<typeof createHookHarness>): string[] {
  return harness
    .components()
    .filter((component) => component.type === ChipButton)
    .map((component) => String(component.props.title));
}

/** What the screen says about an unfinished sign-out, or `null` when it says nothing. */
function notice(harness: ReturnType<typeof createHookHarness>): string | null {
  const element = harness
    .components()
    .find(
      (component) =>
        component.type === ThemedText &&
        component.props.testID === "sign-out-incomplete",
    );
  return element ? String(element.props.children) : null;
}

describe("settings sign-out (T2, S3)", () => {
  it("says the session may still be active instead of reporting a sign-out", async () => {
    const { service, calls } = createService([
      { revoke: "unreachable", revokeError: new Error("fetch failed") },
    ]);
    const { harness, queryClient } = renderSettings(service);
    await harness.flush();

    // A cached answer for the identity that is leaving.
    queryClient.setQueryData(["readings"], [{ id: "reading-1" }]);
    expect(queryClient.getQueryCache().getAll()).toHaveLength(1);

    await press(harness, "Sign out");

    expect(calls.signOut).toBe(1);
    expect(notice(harness)).toBe(
      "Your session may still be active: the server could not be reached to end it.",
    );
    // The ordinary affordance is replaced, not merely annotated: what the screen offers is
    // the retry, so nothing on it reads as a finished sign-out.
    expect(titles(harness)).not.toContain("Sign out");
    expect(titles(harness)).toContain("Try again");
    // The cache belonged to the identity that is leaving, so it is gone either way.
    expect(queryClient.getQueryCache().getAll()).toEqual([]);
  });

  it("asks the same sign-out again from the retry control", async () => {
    const { service, calls } = createService([
      { revoke: "unreachable", revokeError: new Error("fetch failed") },
      { revoke: "revoked" },
    ]);
    const { harness } = renderSettings(service);
    await harness.flush();

    await press(harness, "Sign out");
    await press(harness, "Try again");

    expect(calls.signOut).toBe(2);
    // This time the server ended the session, so the warning and the retry go away and the
    // screen is back to its ordinary sign-out control.
    expect(notice(harness)).toBeNull();
    expect(titles(harness)).toContain("Sign out");
    expect(titles(harness)).not.toContain("Try again");
  });

  it("shows the ordinary outcome and no warning when the server ended the session", async () => {
    const { service, calls } = createService([{ revoke: "revoked" }]);
    const { harness } = renderSettings(service);
    await harness.flush();

    await press(harness, "Sign out");

    expect(calls.signOut).toBe(1);
    expect(notice(harness)).toBeNull();
    expect(titles(harness)).toContain("Sign out");
    expect(titles(harness)).not.toContain("Try again");
  });
});

/**
 * The two halves of an unreachable revoke, on the surface a person uses (S3, S5).
 *
 * Whether the identity survives is the store's answer, and telling the truth about the
 * server session is a separate decision from staying signed in. The screen has to report
 * the live session either way: on the web the cookie is still the session, and on native
 * the server keeps the session until its expiry even though this device dropped its token.
 * What changes between the two is only whether the signed-in tree stays up.
 */
describe("settings sign-out and the storage capability (S3, S5)", () => {
  const INCOMPLETE =
    "Your session may still be active: the server could not be reached to end it.";

  it("keeps the session and offers the retry when clearing does not end it", async () => {
    const { service, calls } = createService([
      {
        revoke: "unreachable",
        revokeError: new Error("fetch failed"),
        endsSessionOnClear: false,
      },
    ]);
    const { harness, probe } = renderSettings(service);
    await harness.flush();

    await press(harness, "Sign out");

    expect(calls.signOut).toBe(1);
    expect(notice(harness)).toBe(INCOMPLETE);
    expect(titles(harness)).toContain("Try again");
    // The session is still the one the person is using, so the screen reporting it has to
    // still be there to report it.
    expect(probe.user()).toEqual(USER);
  });

  it("drops the session it cannot prove, and still says the server's may be live", async () => {
    const { service, calls } = createService([
      {
        revoke: "unreachable",
        revokeError: new Error("fetch failed"),
        endsSessionOnClear: true,
      },
    ]);
    const { harness, probe } = renderSettings(service);
    await harness.flush();
    expect(probe.user()).toEqual(USER);

    await press(harness, "Sign out");

    expect(calls.signOut).toBe(1);
    // The identity goes, because the device cleared the only credential it had and no
    // request could be proven with it any more.
    expect(probe.user()).toBeNull();
    // And the truth still gets told: the server session may be alive until its expiry.
    expect(notice(harness)).toBe(INCOMPLETE);
    expect(titles(harness)).toContain("Try again");
  });
});
