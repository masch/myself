import { describe, expect, it, mock } from "bun:test";
import React from "react";
import { deriveSessionGate } from "../session-gate";
import { createHookHarness } from "./hook-harness";
import type {
  SessionRestore,
  SessionService,
  SessionUser,
} from "@/infrastructure/auth/session-service";

/**
 * The session provider's runtime (T6c `M3`).
 *
 * The provider is what decides whether the launch is `loading`, authenticated, signed out
 * or waiting for a retry, and until T6c only the pure gate derivation and one browser
 * route covered it. These tests drive the real component through the `service` prop: the
 * harness renders it (running its effects, which a server render never does) and the
 * assertions read the context value a real consumer gets.
 *
 * `session-service-instance` is mocked because the real module binds the platform token
 * store (`expo-secure-store`), which has no implementation in the test runtime and is not
 * part of what these tests are about.
 */
mock.module("@/infrastructure/auth/session-service-instance", () => ({
  sessionService: {
    signIn: async () => null,
    signUp: async () => null,
    signOut: async () => {},
    restore: async () => ({ status: "unauthenticated" }),
  },
}));

const { SessionProvider, useSession } = await import("../session-context");
type SessionContextValue = ReturnType<typeof useSession>;

const USER: SessionUser = {
  id: "e0000000-0000-4000-8000-000000000001",
  name: "My self",
  email: "myself@example.com",
  role: "user",
};

interface PendingRestore {
  resolve: (outcome: SessionRestore) => void;
  reject: (error: Error) => void;
}

/**
 * A service whose `restore()` never answers on its own, so each test chooses the outcome
 * the launch sees. `signOut` can be made to reject without touching `restore`.
 */
function createControlledService(options: { signOutRejects?: boolean } = {}) {
  const calls = { restore: 0, signOut: 0 };
  const pendingRestores: PendingRestore[] = [];
  const service: SessionService = {
    async signIn() {
      return USER;
    },
    async signUp() {
      return USER;
    },
    async signOut() {
      calls.signOut += 1;
      if (options.signOutRejects) throw new Error("keychain unavailable");
    },
    restore() {
      calls.restore += 1;
      return new Promise<SessionRestore>((resolve, reject) => {
        pendingRestores.push({ resolve, reject });
      });
    },
  };
  return { service, calls, pendingRestores };
}

/** Captures the context value a consumer of the provider actually reads. */
function createProbe() {
  const seen: SessionContextValue[] = [];
  function Probe() {
    seen.push(useSession());
    return null;
  }
  return {
    Probe,
    latest(): SessionContextValue {
      const last = seen[seen.length - 1];
      if (!last) throw new Error("The probe never rendered");
      return last;
    },
    renders(): number {
      return seen.length;
    },
  };
}

/**
 * A foreground subscription the test fires itself, standing in for `AppState`.
 *
 * The provider takes it as a prop so the revalidation can be driven without a React Native
 * runtime, which never delivers `AppState` changes in this test process.
 */
function createForeground() {
  let listener: (() => void) | null = null;
  let subscriptions = 0;

  const subscribe = (onForeground: () => void) => {
    subscriptions += 1;
    listener = onForeground;
    return () => {
      listener = null;
    };
  };

  return {
    subscribe,
    fire() {
      if (!listener) throw new Error("Nothing subscribed to the foreground");
      listener();
    },
    subscriptions: () => subscriptions,
    isSubscribed: () => listener !== null,
  };
}

function setup(options?: { signOutRejects?: boolean }) {
  const harness = createHookHarness();
  const { service, calls, pendingRestores } = createControlledService(options);
  const probe = createProbe();
  const foreground = createForeground();

  const { Probe } = probe;
  harness.render(
    <SessionProvider
      service={service}
      subscribeToForeground={foreground.subscribe}
    >
      <Probe />
    </SessionProvider>,
  );

  return { harness, service, calls, pendingRestores, probe, foreground };
}

describe("SessionProvider (T6c M3)", () => {
  it("starts on the loading state and asks the service for the stored session once", () => {
    const { calls, probe } = setup();

    expect(calls.restore).toBe(1);
    expect(probe.latest().isLoading).toBe(true);
    expect(probe.latest().user).toBeNull();
    expect(deriveSessionGate(probe.latest())).toBe("loading");
  });

  it("opens the authenticated tree for a session the service restores", async () => {
    const { harness, pendingRestores, probe } = setup();

    pendingRestores[0].resolve({ status: "authenticated", user: USER });
    await harness.flush();

    expect(probe.latest().user).toEqual(USER);
    expect(probe.latest().isLoading).toBe(false);
    expect(probe.latest().restoreProblem).toBeNull();
    expect(deriveSessionGate(probe.latest())).toBe("authenticated");
  });

  it("never opens the authenticated tree when the restore rejects", async () => {
    const { harness, pendingRestores, probe } = setup();

    pendingRestores[0].reject(new Error("restore exploded"));
    await harness.flush();

    expect(probe.latest().user).toBeNull();
    expect(probe.latest().isLoading).toBe(false);
    expect(deriveSessionGate(probe.latest())).not.toBe("authenticated");
    expect(deriveSessionGate(probe.latest())).toBe("unavailable");
  });

  it("never opens the authenticated tree when the restore reports an unreachable server", async () => {
    const { harness, pendingRestores, probe } = setup();

    pendingRestores[0].resolve({
      status: "unavailable",
      reason: "offline",
      message:
        "Could not reach the server. Check your connection and try again.",
    });
    await harness.flush();

    expect(probe.latest().user).toBeNull();
    expect(deriveSessionGate(probe.latest())).toBe("unavailable");
    expect(probe.latest().restoreProblem?.reason).toBe("offline");
  });

  it("retries the restore from the retry state and lands on the session", async () => {
    const { harness, calls, pendingRestores, probe } = setup();

    pendingRestores[0].resolve({
      status: "unavailable",
      reason: "timeout",
      message: "The server did not answer in time.",
    });
    await harness.flush();
    expect(deriveSessionGate(probe.latest())).toBe("unavailable");

    probe.latest().retryRestore();
    await harness.flush();

    expect(calls.restore).toBe(2);
    expect(deriveSessionGate(probe.latest())).toBe("loading");

    pendingRestores[1].resolve({ status: "authenticated", user: USER });
    await harness.flush();

    expect(deriveSessionGate(probe.latest())).toBe("authenticated");
    expect(probe.latest().restoreProblem).toBeNull();
  });

  it("leaves the retry state for the sign-in tree when the user asks to sign in anyway", async () => {
    const { harness, pendingRestores, probe } = setup();

    pendingRestores[0].resolve({
      status: "unavailable",
      reason: "offline",
      message:
        "Could not reach the server. Check your connection and try again.",
    });
    await harness.flush();
    expect(deriveSessionGate(probe.latest())).toBe("unavailable");

    probe.latest().signInAnyway();
    await harness.flush();

    expect(deriveSessionGate(probe.latest())).toBe("unauthenticated");
  });

  it("clears the user on sign-out even when the service rejects", async () => {
    const { harness, pendingRestores, probe } = setup({
      signOutRejects: true,
    });

    pendingRestores[0].resolve({ status: "authenticated", user: USER });
    await harness.flush();
    expect(probe.latest().user).toEqual(USER);

    const failure = await probe
      .latest()
      .signOut()
      .catch((error: unknown) => error);

    await harness.flush();

    expect(failure).toBeInstanceOf(Error);
    expect(probe.latest().user).toBeNull();
    expect(deriveSessionGate(probe.latest())).toBe("unauthenticated");
  });

  it("ends on the later retry's outcome when two retries overlap (R3-1)", async () => {
    const { harness, calls, pendingRestores, probe } = setup();

    pendingRestores[0].resolve({
      status: "unavailable",
      reason: "timeout",
      message: "The server did not answer in time.",
    });
    await harness.flush();
    expect(deriveSessionGate(probe.latest())).toBe("unavailable");

    // Two presses before either restore answers: the first attempt is the slow one.
    probe.latest().retryRestore();
    await harness.flush();
    probe.latest().retryRestore();
    await harness.flush();
    expect(calls.restore).toBe(3);

    // The later attempt answers first, and it authenticates.
    pendingRestores[2].resolve({ status: "authenticated", user: USER });
    await harness.flush();
    expect(deriveSessionGate(probe.latest())).toBe("authenticated");

    // The earlier attempt answers afterwards with a failure. It is stale, so it may not
    // drop the gate back out of the session the newer attempt just resolved: the outcome
    // must not depend on the order the two settle in.
    pendingRestores[1].resolve({
      status: "unavailable",
      reason: "timeout",
      message: "The server did not answer in time.",
    });
    await harness.flush();

    expect(probe.latest().user).toEqual(USER);
    expect(probe.latest().restoreProblem).toBeNull();
    expect(deriveSessionGate(probe.latest())).toBe("authenticated");
  });

  it("does not write state when the restore settles after unmount", async () => {
    const { harness, pendingRestores, probe } = setup();
    const rendersBeforeUnmount = probe.renders();

    harness.unmount();
    pendingRestores[0].resolve({ status: "authenticated", user: USER });
    await harness.flush();

    expect(probe.renders()).toBe(rendersBeforeUnmount);
    expect(probe.latest().user).toBeNull();
    expect(probe.latest().isLoading).toBe(true);
  });
});

describe("sign-out and a replacement identity (L37)", () => {
  it("does not reauthenticate when the launch restore settles after sign-out", async () => {
    const { harness, pendingRestores, probe } = setup();

    // The launch restore is still in flight when the user signs out.
    await probe.latest().signOut();
    await harness.flush();

    // It answered for the credential that sign-out just removed, so it may not put the
    // previous identity back: settling late must not undo the sign-out.
    pendingRestores[0].resolve({ status: "authenticated", user: USER });
    await harness.flush();

    expect(probe.latest().user).toBeNull();
    expect(probe.latest().restoreProblem).toBeNull();
    expect(deriveSessionGate(probe.latest())).toBe("unauthenticated");
  });

  it("clears the loading flag on sign-out even when no restore ever answers", async () => {
    const { harness, probe } = setup();
    expect(probe.latest().isLoading).toBe(true);

    // The launch restore never settles at all: nothing will clear the flag except
    // sign-out itself, and a flag left on would hold the gate on `loading` forever.
    await probe.latest().signOut();
    await harness.flush();

    expect(probe.latest().isLoading).toBe(false);
    expect(deriveSessionGate(probe.latest())).toBe("unauthenticated");
  });

  it("clears the loading flag on sign-out even when the service rejects", async () => {
    const { harness, probe } = setup({ signOutRejects: true });

    await probe
      .latest()
      .signOut()
      .catch(() => undefined);
    await harness.flush();

    expect(probe.latest().isLoading).toBe(false);
    expect(probe.latest().user).toBeNull();
    expect(deriveSessionGate(probe.latest())).toBe("unauthenticated");
  });

  for (const transition of ["signIn", "signUp"] as const) {
    it(`lets a stale restore lose to the identity ${transition} establishes`, async () => {
      const { harness, pendingRestores, probe } = setup();

      await probe.latest()[transition]({
        email: "ada@example.com",
        password: "correct horse",
      } as never);
      await harness.flush();
      expect(probe.latest().user).toEqual(USER);

      // The launch restore predates this identity. Its answer is about the previous
      // credential, so it may not overwrite the one that just signed in.
      pendingRestores[0].resolve({ status: "unauthenticated" });
      await harness.flush();

      expect(probe.latest().user).toEqual(USER);
      expect(deriveSessionGate(probe.latest())).toBe("authenticated");
    });
  }
});

describe("foreground revalidation (T6c m6)", () => {
  it("asks the server again when the app returns to the foreground", async () => {
    const { harness, calls, pendingRestores, probe, foreground } = setup();

    pendingRestores[0].resolve({ status: "authenticated", user: USER });
    await harness.flush();
    expect(probe.latest().user).toEqual(USER);

    foreground.fire();
    await harness.flush();

    expect(calls.restore).toBe(2);
  });

  it("signs the tree out when the foreground check finds the session expired", async () => {
    const { harness, pendingRestores, probe, foreground } = setup();

    pendingRestores[0].resolve({ status: "authenticated", user: USER });
    await harness.flush();

    // The session expired while the app was in the background: the server rejects the
    // stored credential, so the tree must stop claiming a signed-in identity.
    foreground.fire();
    await harness.flush();
    expect(probe.latest().user).toEqual(USER);
    expect(probe.latest().isLoading).toBe(false);

    pendingRestores[1].resolve({ status: "unauthenticated" });
    await harness.flush();

    expect(probe.latest().user).toBeNull();
    expect(probe.latest().restoreProblem).toBeNull();
    expect(deriveSessionGate(probe.latest())).toBe("unauthenticated");
  });

  it("keeps the tree up when the foreground check cannot reach the server", async () => {
    const { harness, pendingRestores, probe, foreground } = setup();

    pendingRestores[0].resolve({ status: "authenticated", user: USER });
    await harness.flush();

    foreground.fire();
    await harness.flush();

    pendingRestores[1].resolve({
      status: "unavailable",
      reason: "offline",
      message:
        "Could not reach the server. Check your connection and try again.",
    });
    await harness.flush();

    // Offline is not signed out (T6c `M2`), and a revalidation that could not answer must
    // not take a working tree away either: no user is cleared and no retry surface appears.
    expect(probe.latest().user).toEqual(USER);
    expect(probe.latest().restoreProblem).toBeNull();
    expect(deriveSessionGate(probe.latest())).toBe("authenticated");
  });

  it("checks nothing while nobody is signed in", async () => {
    const { harness, calls, pendingRestores, foreground } = setup();

    pendingRestores[0].resolve({ status: "unauthenticated" });
    await harness.flush();

    foreground.fire();
    await harness.flush();

    expect(calls.restore).toBe(1);
  });

  it("stops listening when the provider unmounts", async () => {
    const { harness, pendingRestores, foreground } = setup();

    pendingRestores[0].resolve({ status: "authenticated", user: USER });
    await harness.flush();
    expect(foreground.isSubscribed()).toBe(true);

    harness.unmount();

    expect(foreground.isSubscribed()).toBe(false);
  });
});
