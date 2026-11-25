import "@/infrastructure/crypto/polyfill";
import { Stack, type ErrorBoundaryProps } from "expo-router";

import { AppButton, EmptyState, Spinner, ToastProvider } from "@/components";
import {
  LocalIdentityNotice,
  LocalSessionUser,
  isMirrorPending,
  type LocalMirrorPhase,
} from "@/context/local-session-user";
import { SessionProvider, useSession } from "@/context/session-context";
import {
  appShellScreens,
  deriveSessionGate,
  type AppShellMode,
} from "@/context/session-gate";
import { isBarterSimulationTab } from "@/features/barter/simulation-tab";
import { initDatabase } from "@/infrastructure/persistence/database";
import { isDatabaseInUseError } from "@/infrastructure/persistence/database-open-error";
import { queryClient } from "@/infrastructure/query/query-client";
import { colors, spacing } from "@/theme";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "expo-router/react-navigation";
import { SQLiteProvider, useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import { Platform, StyleSheet, useColorScheme, View } from "react-native";

/**
 * Global Error Boundary for Expo Router.
 * Catches unhandled runtime or database errors and displays a native recovery UI.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <EmptyState
      icon="sf:exclamationmark.triangle.fill"
      iconColor={colors.systemOrange}
      iconSize={48}
      title="Something went wrong"
      description={error.message}
      action={<AppButton title="Try Again" variant="primary" onPress={retry} />}
      style={{
        flex: 1,
        backgroundColor: colors.systemBackground,
        padding: spacing.xl,
        justifyContent: "center",
      }}
    />
  );
}

/**
 * Name of the SQLite database that persists across app launches.
 */
const PERSISTED_DATABASE_NAME = "myself.db";

/**
 * Shown instead of the app when the browser already has the local database open
 * in another tab of this origin.
 *
 * Retrying reloads the tab on purpose: a failed open leaves expo-sqlite's web
 * worker without a usable VFS, and that worker belongs to the library, so a
 * fresh document is the only way to try again once the access handles are free.
 */
function DatabaseInUseScreen() {
  return (
    <EmptyState
      testID="database-in-use-screen"
      icon="sf:info.circle.fill"
      iconColor={colors.systemBlue}
      iconSize={48}
      title="La app ya está abierta en otra pestaña"
      description="La base de datos local se puede usar desde una sola pestaña a la vez. Cerrá la otra pestaña y volvé a intentar."
      action={
        <AppButton
          title="Reintentar"
          variant="primary"
          onPress={() => window.location.reload()}
        />
      }
      style={{
        flex: 1,
        backgroundColor: colors.systemBackground,
        padding: spacing.xl,
        justifyContent: "center",
      }}
    />
  );
}

/**
 * Opens the persisted database and renders the app once it is ready.
 *
 * A web second tab cannot own the database, and that failure used to reach the
 * router error boundary as a crash. It becomes this explanation instead, with a
 * retry; every other open failure keeps going to the error boundary.
 */
function DatabaseGate() {
  const [isInUse, setIsInUse] = useState(false);

  const handleOpenError = useCallback((error: Error) => {
    // The conflict is a web-only failure: it is the text expo-sqlite's web
    // worker prints when OPFS refuses a second access handle. Answering it on
    // native would offer a browser reload the platform does not have.
    if (Platform.OS !== "web" || !isDatabaseInUseError(error)) {
      throw error;
    }

    // `SQLiteProvider` reports the failure from inside its own render, so the
    // update is deferred to the next render instead of changing state while
    // another component renders. That render then drops the provider.
    queueMicrotask(() => setIsInUse(true));
  }, []);

  if (isInUse) {
    return <DatabaseInUseScreen />;
  }

  return (
    <SQLiteProvider
      databaseName={PERSISTED_DATABASE_NAME}
      onInit={initDatabase}
      onError={handleOpenError}
      useSuspense={false}
    >
      <AppNavigation />
    </SQLiteProvider>
  );
}

/**
 * Shown while the stored session is being restored, instead of a sign-in flash.
 *
 * It also covers the one tick between a resolved session and its local mirror settling
 * (T6c `m5`): the tree waits for the mirror, so a write issued immediately after sign-in
 * cannot reach the database before the identity has a local row.
 */
function SessionLoadingScreen() {
  return (
    <EmptyState
      testID="session-loading-screen"
      icon="sf:person.crop.circle.badge.questionmark"
      iconColor={colors.secondaryLabel}
      iconSize={48}
      title="Restoring your session"
      description="One moment…"
      action={<Spinner size="md" label="Loading" />}
      style={styles.gateScreen}
    />
  );
}

/**
 * Shown when the stored session could not be checked (T6c `M1`, `M2`).
 *
 * Offline is not signed out: the token is still stored, so this screen offers a retry and,
 * secondarily, a way into the auth tree for a user who would rather sign in. It is
 * deliberately not a sign-in form — asking a user with a valid session for a password does
 * not work against a server that is not answering.
 */
function SessionUnavailableScreen() {
  const { restoreProblem, retryRestore, signInAnyway } = useSession();

  return (
    <EmptyState
      testID="session-unavailable-screen"
      icon="sf:wifi.exclamationmark"
      iconColor={colors.systemOrange}
      iconSize={48}
      title="Can't reach the server"
      description={
        restoreProblem?.message ??
        "Your session could not be restored. Try again, or sign in again."
      }
      action={
        <View style={styles.gateActions}>
          <AppButton
            title="Try again"
            variant="primary"
            onPress={retryRestore}
          />
          <AppButton
            title="Sign in anyway"
            variant="secondary"
            onPress={signInAnyway}
          />
        </View>
      }
      style={styles.gateScreen}
    />
  );
}

/**
 * Renders the app's route stack with color-scheme theming and shared toast
 * notifications. It deliberately excludes the providers that own the SQLite
 * database, so a barter simulation tab can render without opening one.
 */
function AppShell({ mode }: { mode: AppShellMode }) {
  const colorScheme = useColorScheme();

  // The guards are what enforce the gate: a screen tree whose guard is false is not
  // registered in the navigator, so an unauthenticated client has no app route to reach
  // and a signed-in one has no auth route to land on. Which branch each mode opens is a
  // named decision (T6c `m3`), never a negation of the signed-out state.
  const { app: showAppScreens, auth: showAuthScreens } = appShellScreens(mode);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <ToastProvider>
        <Stack
          screenOptions={{
            contentStyle: { backgroundColor: colors.transparent },
          }}
        >
          <Stack.Protected guard={showAuthScreens}>
            <Stack.Screen name="sign-in" options={{ headerShown: false }} />
            <Stack.Screen name="sign-up" options={{ headerShown: false }} />
          </Stack.Protected>
          <Stack.Protected guard={showAppScreens}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="modal"
              options={{
                presentation: "modal",
                headerTitle: "New Task",
              }}
            />
            <Stack.Screen
              name="reading-modal"
              options={{
                presentation: "modal",
                headerTitle: "Meditation Reading",
              }}
            />
            <Stack.Screen
              name="dev-showcase"
              options={{
                headerTitle: "Design System",
              }}
            />
            <Stack.Screen
              name="barter"
              options={{
                headerTitle: "Mercado de productores",
              }}
            />
            <Stack.Screen
              name="barter-inbox"
              options={{
                headerTitle: "Bandeja de Trueques",
              }}
            />
            <Stack.Screen
              name="barter-trade/[id]"
              options={{
                headerTitle: "Entrega de Trueque",
              }}
            />
          </Stack.Protected>
        </Stack>
      </ToastProvider>
    </ThemeProvider>
  );
}

/**
 * The root session gate (S13, T6c `M1`/`M2`).
 *
 * Four states, one navigator tree: while the stored session is being restored the app
 * shows a loading surface (never the sign-in form, which would flash at a signed-in user);
 * a resolved session opens the app screens; no session opens only the sign-up and sign-in
 * screens; and a restore that could not answer opens a retry surface that keeps the token.
 * It sits below `SQLiteProvider` on purpose — the database gate still runs first, so a
 * device without a usable database reports that before any session work happens — and
 * outside `DatabaseGate` for the barter simulation tab, which renders without either.
 */
function SessionGate() {
  const { user, isLoading, restoreProblem } = useSession();
  const state = deriveSessionGate({ user, isLoading, restoreProblem });

  if (state === "loading") {
    return <SessionLoadingScreen />;
  }

  if (state === "unavailable") {
    return <SessionUnavailableScreen />;
  }

  return <AppShell mode={state} />;
}

/**
 * The tree a signed-in client sees, withheld until the mirror of its identity settles
 * (T6c `m5`).
 *
 * The mirror used to be fire-and-forget: the tree opened in the same commit the write
 * started, so a task or reflection created immediately after sign-in could reach the
 * database before the identity had a local row and fail its foreign key. Waiting for the
 * phase instead keeps the race out of the product, and it waits for the *write*, not for
 * its success: a mirror that failed still opens the tree (`m1`) and shows the notice, so a
 * local ownership problem never locks a signed-in user out of the content that does work.
 */
function SessionTree() {
  const db = useSQLiteContext();
  const { user } = useSession();
  const [mirror, setMirror] = useState<LocalMirrorPhase>({ phase: "none" });
  const isWaitingForMirror = isMirrorPending(mirror, user);
  const notice =
    !isWaitingForMirror && mirror.phase === "settled" ? mirror.message : null;

  return (
    <View style={styles.appRoot}>
      <LocalSessionUser db={db} onMirror={setMirror} />
      {isWaitingForMirror ? <SessionLoadingScreen /> : <SessionGate />}
      {notice ? <LocalIdentityNotice message={notice} /> : null}
    </View>
  );
}

/**
 * Wraps the app in the session the whole authenticated tree reads (`S13`).
 */
function AppNavigation() {
  return (
    <SessionProvider>
      <SessionTree />
    </SessionProvider>
  );
}

export default function RootLayout() {
  // A barter simulation tab must not touch SQLite at all.
  //
  // On web, expo-sqlite creates its persisted `AccessHandlePoolVFS` on the
  // first database message (`web/worker.ts` -> `maybeInitAsync`), and that VFS
  // holds exclusive synchronous OPFS access handles. Two tabs of the same
  // origin therefore cannot both open a database: the second one dies with
  // `NoModificationAllowedError: No modification allowed`. Opening an
  // in-memory database does not avoid it, because the persistent VFS is
  // created unconditionally, whatever database is opened afterwards.
  //
  // The barter POC needs two tabs of one origin, because its state syncs
  // through a `BroadcastChannel` and a channel only reaches tabs of one origin.
  // A simulation tab therefore renders the app shell without the database
  // providers: every barter screen is fully local, and the persisted database
  // of regular tabs is never touched.
  if (isBarterSimulationTab()) {
    return (
      <QueryClientProvider client={queryClient}>
        <AppShell mode="ungated" />
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <DatabaseGate />
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  appRoot: {
    flex: 1,
  },
  gateScreen: {
    flex: 1,
    backgroundColor: colors.systemBackground,
    padding: spacing.xl,
    justifyContent: "center",
  },
  gateActions: {
    gap: spacing.sm,
  },
});
