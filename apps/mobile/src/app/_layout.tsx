import "@/infrastructure/crypto/polyfill";
import { Stack, type ErrorBoundaryProps } from "expo-router";

import {
  ThemeProvider,
  DarkTheme,
  DefaultTheme,
} from "expo-router/react-navigation";
import { useColorScheme } from "react-native";
import { SQLiteProvider } from "expo-sqlite";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/infrastructure/query/query-client";
import { initDatabase } from "@/infrastructure/persistence/database";
import { AuthProvider } from "@/context/auth-context";
import { AppButton, EmptyState } from "@/components";
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

function AppNavigation() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
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
        </Stack>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SQLiteProvider
        databaseName="myself.db"
        onInit={initDatabase}
        useSuspense={false}
      >
        <AppNavigation />
      </SQLiteProvider>
    </QueryClientProvider>
  );
}
