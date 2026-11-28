import { describe, expect, it } from "bun:test";
import {
  appShellScreens,
  deriveSessionGate,
  type AppShellMode,
} from "../session-gate";
import type {
  SessionRestoreProblem,
  SessionUser,
} from "@/infrastructure/auth/session-service";

const USER: SessionUser = {
  id: "e0000000-0000-4000-8000-000000000001",
  name: "My self",
  email: "myself@example.com",
  role: "user",
};

/** The state a restore that never reached the server leaves behind (T6c `M2`). */
const OFFLINE_PROBLEM: SessionRestoreProblem = {
  reason: "offline",
  message: "Could not reach the server. Check your connection and try again.",
};

describe("deriveSessionGate (S13 root gate)", () => {
  it("waits while the stored session is being restored", () => {
    expect(deriveSessionGate({ isLoading: true, user: null })).toBe("loading");
    expect(deriveSessionGate({ isLoading: true, user: USER })).toBe("loading");
  });

  it("opens the authenticated tree only for a resolved session", () => {
    expect(deriveSessionGate({ isLoading: false, user: USER })).toBe(
      "authenticated",
    );
  });

  it("sends a browser with no session to the auth tree", () => {
    expect(deriveSessionGate({ isLoading: false, user: null })).toBe(
      "unauthenticated",
    );
  });

  it("offers the retry state, not the sign-in form, when the last restore could not answer", () => {
    // Offline is not signed out (T6c `M2`): the token is still stored and the session is
    // unknown, so the gate must not claim the browser is unauthenticated.
    expect(
      deriveSessionGate({
        isLoading: false,
        user: null,
        restoreProblem: OFFLINE_PROBLEM,
      }),
    ).toBe("unavailable");
  });

  it("keeps loading ahead of the retry state while a retry is in flight", () => {
    expect(
      deriveSessionGate({
        isLoading: true,
        user: null,
        restoreProblem: OFFLINE_PROBLEM,
      }),
    ).toBe("loading");
  });

  it("opens the authenticated tree for a session resolved after a failed restore", () => {
    expect(
      deriveSessionGate({
        isLoading: false,
        user: USER,
        restoreProblem: OFFLINE_PROBLEM,
      }),
    ).toBe("authenticated");
  });
});

describe("appShellScreens (T6c m3)", () => {
  it("opens the app route tree only for the modes that name it", () => {
    // Deliberately not `mode !== "unauthenticated"`: the simulation shell is listed by
    // name, so the app routes are opened by a decision instead of by a negation.
    expect(appShellScreens("authenticated")).toEqual({
      app: true,
      auth: false,
    });
    expect(appShellScreens("ungated")).toEqual({ app: true, auth: false });
    expect(appShellScreens("unauthenticated")).toEqual({
      app: false,
      auth: true,
    });
  });

  it("refuses a mode nobody decided about instead of opening the tree", () => {
    expect(() => appShellScreens("future-mode" as AppShellMode)).toThrow(
      /Unhandled app shell mode/,
    );
  });
});
