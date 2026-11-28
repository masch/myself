import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { ThemedText } from "@/components";
import { colors, spacing } from "@/theme";

/**
 * The switch between the sign-in and sign-up forms.
 *
 * Navigates through `useRouter()` like the rest of the app rather than `Link`, and is
 * announced as a link so it keeps that role for assistive technology and the browser.
 */
export interface AuthSwitchLinkProps {
  href: "/sign-in" | "/sign-up" | "/forgot-password";
  prompt: string;
  label: string;
}

export function AuthSwitchLink({ href, prompt, label }: AuthSwitchLinkProps) {
  const router = useRouter();

  return (
    <View style={styles.row}>
      <ThemedText variant="callout" color={colors.secondaryLabel}>
        {prompt}
      </ThemedText>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={label}
        onPress={() => router.push(href)}
      >
        <ThemedText variant="callout" color={colors.systemBlue}>
          {label}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
});
