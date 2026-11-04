import "@/infrastructure/crypto/polyfill";
import { Stack, type ErrorBoundaryProps } from "expo-router";

import {
  ThemeProvider,
  DarkTheme,
  DefaultTheme,
} from "expo-router/react-navigation";
import { useCallback, useState } from "react";
import { Platform, useColorScheme } from "react-native";
import { SQLiteProvider } from "expo-sqlite";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/infrastructure/query/query-client";
import { initDatabase } from "@/infrastructure/persistence/database";
import { isDatabaseInUseError } from "@/infrastructure/persistence/database-open-error";
import { isBarterSimulationTab } from "@/features/barter/simulation-tab";
import { AuthProvider } from "@/context/auth-context";
import { AppButton, EmptyState, ToastProvider } from "@/components";
import { colors, spacing } from "@/theme";

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

/** Name of the SQLite database that persists across app launches. */
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
 * Renders the app's route stack with color-scheme theming and shared toast
 * notifications. It deliberately excludes the providers that own the SQLite
 * database, so a barter simulation tab can render without opening one.
 */
function AppShell() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <ToastProvider>
        <Stack
          screenOptions={{
            contentStyle: { backgroundColor: colors.transparent },
          }}
        >
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
              headerTitle: "Góndola Trueque P2P",
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
        </Stack>
      </ToastProvider>
    </ThemeProvider>
  );
}

/**
 * Renders the app's route stack with authentication, color-scheme theming,
 * and shared toast notifications.
 */
function AppNavigation() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
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
        <AppShell />
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <DatabaseGate />
    </QueryClientProvider>
  );
}
