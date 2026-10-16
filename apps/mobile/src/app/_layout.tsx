import "@/infrastructure/crypto/polyfill";
import { Stack, type ErrorBoundaryProps } from "expo-router";

import {
  ThemeProvider,
  DarkTheme,
  DefaultTheme,
} from "expo-router/react-navigation";
import { Platform, useColorScheme } from "react-native";
import { SQLiteProvider } from "expo-sqlite";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/infrastructure/query/query-client";
import { initDatabase } from "@/infrastructure/persistence/database";
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

/** Name of the SQLite database that persists across app launches. */
const PERSISTED_DATABASE_NAME = "myself.db";

/** Session key that remembers this tab's simulation role while it navigates. */
const SIMULATION_TAB_STORAGE_KEY = "p2p_barter_simulation_tab";

/**
 * Whether this tab is a barter producer simulation, opened as one of the two
 * tabs the POC uses to simulate two producers (`?producerId=` or `?producer=`).
 *
 * The answer is remembered for the tab: in-app navigation drops the query
 * param, and re-deciding mid-session would swap the whole provider tree under
 * the router, remounting the app and jumping back to the initial route. On
 * native this is always false.
 */
function isBarterSimulationTab(): boolean {
  if (Platform.OS !== "web" || typeof window === "undefined") {
    return false;
  }

  const params = new URLSearchParams(window.location.search);

  if (params.has("producerId") || params.has("producer")) {
    try {
      window.sessionStorage.setItem(SIMULATION_TAB_STORAGE_KEY, "1");
    } catch {
      // Storage can be denied; the URL of this load is enough.
    }

    return true;
  }

  try {
    const remembered = window.sessionStorage.getItem(
      SIMULATION_TAB_STORAGE_KEY,
    );

    if (remembered !== null) {
      return remembered === "1";
    }

    window.sessionStorage.setItem(SIMULATION_TAB_STORAGE_KEY, "0");
  } catch {
    // Storage can be denied; fall back to what this load asked for.
  }

  return false;
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
      <SQLiteProvider
        databaseName={PERSISTED_DATABASE_NAME}
        onInit={initDatabase}
        useSuspense={false}
      >
        <AppNavigation />
      </SQLiteProvider>
    </QueryClientProvider>
  );
}
