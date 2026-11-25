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

function setup(options?: { signOutRejects?: boolean }) {
  const harness = createHookHarness();
  const { service, calls, pendingRestores } = createControlledService(options);
  const probe = createProbe();

  const { Probe } = probe;
  harness.render(
    <SessionProvider service={service}>
      <Probe />
    </SessionProvider>,
  );

  return { harness, service, calls, pendingRestores, probe };
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
