import { describe, expect, it, mock } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import type { SQLiteDatabase } from "expo-sqlite";
import { createHookHarness } from "@/context/__tests__/hook-harness";
import type {
  SessionService,
  SessionUser,
} from "@/infrastructure/auth/session-service";
import type { SessionUserMirrorResult } from "@/infrastructure/persistence/database";
import type { LocalMirrorPhase } from "../local-session-user";

/**
 * The mirror as the tree sees it (T6c `m5`, and the render test L31's review asked for).
 *
 * `upsertSessionUser` is covered against a real database elsewhere. What was unproved is
 * the projection: the phase the tree is told, the notice it renders, and — since `m5` —
 * that a signed-in tree is withheld until the mirror of that identity has settled. A
 * fire-and-forget mirror let the tree open in the same commit the write started, so a
 * write issued immediately could lose the race.
 */
mock.module("@/infrastructure/auth/session-service-instance", () => ({
  sessionService: {
    signIn: async () => null,
    signUp: async () => null,
    signOut: async () => {},
    restore: async () => ({ status: "unauthenticated" }),
  },
}));

const { SessionProvider } = await import("@/context/session-context");
const { LocalSessionUser, LocalIdentityNotice, isMirrorPending } =
  await import("../local-session-user");
const USER: SessionUser = {
  id: "e0000000-0000-4000-8000-000000000001",
  name: "My self",
  email: "myself@example.com",
  role: "user",
};

const EMAIL_TAKEN_MESSAGE =
  "That address already belongs to another profile on this device.";

const ALREADY_MIRRORED: SessionUserMirrorResult = { status: "mirrored" };
const EMAIL_TAKEN: SessionUserMirrorResult = {
  status: "email-owned-by-another-profile",
  ownerId: "e0000000-0000-4000-8000-0000000000e1",
  message: EMAIL_TAKEN_MESSAGE,
};

const db = {} as SQLiteDatabase;

const signedInService: SessionService = {
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

/** Renders the mirror under the provider and records every phase it reports. */
function setup(
  mirrorImpl: (
    db: SQLiteDatabase,
    user: SessionUser,
  ) => Promise<SessionUserMirrorResult> = async () => ALREADY_MIRRORED,
) {
  const harness = createHookHarness();
  const phases: LocalMirrorPhase[] = [];
  const mirror = mock(mirrorImpl);

  function Probe() {
    return (
      <LocalSessionUser
        db={db}
        onMirror={(phase) => phases.push(phase)}
        mirror={mirror}
      />
    );
  }

  harness.render(
    <SessionProvider service={signedInService}>
      <Probe />
    </SessionProvider>,
  );

  return { harness, phases, mirror };
}

/** A mirror write the test releases by hand, to observe the tree between the two phases. */
function deferredMirror() {
  let release: (result: SessionUserMirrorResult) => void = () => {};
  const pending = new Promise<SessionUserMirrorResult>((resolve) => {
    release = resolve;
  });

  return { mirror: () => pending, release };
}

describe("LocalSessionUser projection (T6c m5)", () => {
  it("reports the mirror as pending before it settles, so the tree can wait", async () => {
    const deferred = deferredMirror();
    const { harness, phases, mirror } = setup(deferred.mirror);

    // The restore resolves on the first flush; the mirror write does not.
    await harness.flush();

    expect(mirror).toHaveBeenCalledTimes(1);
    expect(phases.at(-1)).toEqual({ phase: "pending", userId: USER.id });

    deferred.release(ALREADY_MIRRORED);
    await harness.flush();

    expect(phases.at(-1)).toEqual({
      phase: "settled",
      userId: USER.id,
      message: null,
    });
  });

  it("turns a refused mirror into the message the notice renders", async () => {
    const { harness, phases } = setup(async () => EMAIL_TAKEN);

    await harness.flush();

    expect(phases.at(-1)).toEqual({
      phase: "settled",
      userId: USER.id,
      message: EMAIL_TAKEN_MESSAGE,
    });
  });

  it("turns a database error into a notice instead of a silent failure", async () => {
    const { harness, phases } = setup(async () => {
      throw new Error("disk I/O error");
    });

    await harness.flush();

    const last = phases.at(-1) as { phase: string; message: string | null };
    expect(last.phase).toBe("settled");
    expect(last.message).toContain("could not be saved on this device");
  });
});

describe("isMirrorPending (T6c m5)", () => {
  it("opens nothing for an identity whose mirror has not settled yet", () => {
    expect(isMirrorPending({ phase: "none" }, USER)).toBe(true);
    expect(isMirrorPending({ phase: "pending", userId: USER.id }, USER)).toBe(
      true,
    );
    // A settled phase that describes another identity is no better than a pending one:
    // the current identity still has no local owner.
    expect(
      isMirrorPending(
        { phase: "settled", userId: "another-id", message: null },
        USER,
      ),
    ).toBe(true);
  });

  it("opens the tree once the mirror of this identity has settled", () => {
    expect(
      isMirrorPending(
        { phase: "settled", userId: USER.id, message: null },
        USER,
      ),
    ).toBe(false);
    // A notice does not close the tree: the session is real, only local ownership failed.
    expect(
      isMirrorPending(
        { phase: "settled", userId: USER.id, message: "no local owner" },
        USER,
      ),
    ).toBe(false);
  });

  it("never waits for a mirror when nobody is signed in", () => {
    expect(isMirrorPending({ phase: "none" }, null)).toBe(false);
    expect(isMirrorPending({ phase: "pending", userId: USER.id }, null)).toBe(
      false,
    );
  });
});

describe("LocalIdentityNotice", () => {
  it("renders the mirror problem it was given", () => {
    const html = renderToString(
      <LocalIdentityNotice message={EMAIL_TAKEN_MESSAGE} />,
    );

    expect(html).toContain('data-testid="local-identity-notice"');
    expect(html).toContain(EMAIL_TAKEN_MESSAGE);
  });
});
