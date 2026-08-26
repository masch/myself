import { Stack, type ErrorBoundaryProps } from "expo-router";
import {
  ThemeProvider,
  DarkTheme,
  DefaultTheme,
} from "expo-router/react-navigation";
import { useColorScheme, View, Text, StyleSheet } from "react-native";
import { SQLiteProvider } from "expo-sqlite";
import { Image } from "expo-image";
import { initDatabase } from "@/db/database";
import { AuthProvider } from "@/context/auth-context";
import { AppButton } from "@/components";
import { colors } from "@/theme/colors";

/**
 * Global Error Boundary for Expo Router.
 * Catches unhandled runtime or database errors and displays a native recovery UI.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View
      style={[
        styles.errorContainer,
        { backgroundColor: colors.systemBackground },
      ]}
    >
      <Image
        source="sf:exclamationmark.triangle.fill"
        style={styles.errorIcon}
      />
      <Text style={[styles.errorTitle, { color: colors.label }]}>
        Something went wrong
      </Text>
      <Text style={[styles.errorMessage, { color: colors.secondaryLabel }]}>
        {error.message}
      </Text>
      <AppButton title="Try Again" variant="primary" onPress={retry} />
    </View>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <SQLiteProvider
      databaseName="myself.db"
      onInit={initDatabase}
      useSuspense={false}
    >
      <AuthProvider>
        <ThemeProvider
          value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
        >
          <Stack
            screenOptions={{
              contentStyle: { backgroundColor: "transparent" },
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
          </Stack>
        </ThemeProvider>
      </AuthProvider>
    </SQLiteProvider>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  errorIcon: {
    width: 48,
    height: 48,
    tintColor: "#FF9500",
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  errorMessage: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  retryText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 15,
  },
});
