import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import type { SQLiteDatabase } from "expo-sqlite";
import { ThemedText } from "@/components";
import { useSession } from "@/context/session-context";
import type { SessionUser } from "@/infrastructure/auth/session-service";
import {
  upsertSessionUser,
  type SessionUserMirrorResult,
} from "@/infrastructure/persistence/database";
import { colors, radius, spacing } from "@/theme";

/**
 * The local identity mirror, as the tree sees it (S13, T6c `m5`).
 *
 * Two things live here instead of in `_layout.tsx`: the phase the mirror reports, which is
 * what the tree waits for, and the notice it renders when the mirror did not happen. Both
 * are ordinary modules so they can be tested — a route file's exports belong to the router.
 */

/**
 * What the mirror has to say about the current identity.
 *
 * `pending` and `settled` carry the id they describe, so a phase left over from the
 * previous identity (or from a sign-out) is never mistaken for the current one.
 */
export type LocalMirrorPhase =
  | { phase: "none" }
  | { phase: "pending"; userId: string }
  | { phase: "settled"; userId: string; message: string | null };

/** Reported when the database itself refused the write, not when it refused the identity. */
const DRIVER_FAILURE_MESSAGE =
  "Your profile could not be saved on this device, so new local data may not be saved.";

/**
 * Whether the signed-in tree has to wait for the mirror (T6c `m5`).
 *
 * The tree used to open in the same commit the mirror started, so a write issued
 * immediately after sign-in could reach the database before the identity had a local row
 * and fail its foreign key. Waiting keeps that race out of the product without gating on
 * the *outcome*: a mirror that failed still opens the tree (`m1`), because the session is
 * real and only local ownership is missing — that is what the notice is for.
 */
export function isMirrorPending(
  phase: LocalMirrorPhase,
  user: SessionUser | null,
): boolean {
  if (!user) return false;
  return phase.phase !== "settled" || phase.userId !== user.id;
}

export interface LocalSessionUserProps {
  db: SQLiteDatabase;
  /** Called with every phase transition; the tree decides what to do with it. */
  onMirror: (phase: LocalMirrorPhase) => void;
  /** Test seam: the write itself (`upsertSessionUser` against a real database). */
  mirror?: (
    db: SQLiteDatabase,
    user: SessionUser,
  ) => Promise<SessionUserMirrorResult>;
}

/**
 * Keeps a local `user` row for whoever is signed in (`S13`).
 *
 * Every per-user row on the device owns a `user_id` foreign key, and the session identity
 * comes from the server: without this mirror the admin, or an account created a second
 * ago, could not create its first task or reflection. It runs where both the database and
 * the session exist (below `SQLiteProvider`, inside `SessionProvider`).
 *
 * A mirror that did not happen is not swallowed here (T6c `m1`): `upsertSessionUser`
 * reports every refusal as a result, and this component turns it into a phase the tree
 * renders, so a session with no local owner is visible instead of silent.
 */
export function LocalSessionUser({
  db,
  onMirror,
  mirror = upsertSessionUser,
}: LocalSessionUserProps) {
  const { user } = useSession();

  useEffect(() => {
    if (!user) {
      onMirror({ phase: "none" });
      return;
    }

    // A sign-out, or another identity, makes this answer stale: only the newest attempt
    // may report, so a slow write cannot describe a session that is no longer current.
    let active = true;

    onMirror({ phase: "pending", userId: user.id });

    void mirror(db, user).then(
      (result) => {
        if (!active) return;
        onMirror({
          phase: "settled",
          userId: user.id,
          message: result.status === "mirrored" ? null : result.message,
        });
      },
      (error: unknown) => {
        // The database itself refused the write (a driver error, not a refused identity):
        // the mirror did not happen either, so it is reported the same way.
        console.warn(
          "[session] Failed to mirror the signed-in identity into the local database:",
          error,
        );
        if (active) {
          onMirror({
            phase: "settled",
            userId: user.id,
            message: DRIVER_FAILURE_MESSAGE,
          });
        }
      },
    );

    return () => {
      active = false;
    };
  }, [db, user, onMirror, mirror]);

  return null;
}

/**
 * The one thing the tree does with a mirror that did not happen (T6c `m1`).
 *
 * A note, not a gate: the session is real and the tree is correct, but this device could
 * not store an owner for it, so the user's own local writes (tasks, reflections,
 * preferences) will fail their foreign key. The failure is rendered where it happens
 * instead of being written to a log nobody reads.
 */
export function LocalIdentityNotice({ message }: { message: string }) {
  return (
    <View testID="local-identity-notice" style={styles.identityNotice}>
      <ThemedText variant="caption1" color={colors.systemOrange}>
        {message}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  identityNotice: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.warningSubdued,
  },
});
