import { StyleSheet, View } from "react-native";
import {
  ThemedText,
  ThemedTextInput,
  type ThemedTextInputProps,
} from "@/components";
import { colors, spacing } from "@/theme";

/**
 * One labelled field of an auth form.
 *
 * The label is rendered above the input and passed as `accessibilityLabel`, which is
 * what the repository requires of every form input: a placeholder disappears as soon
 * as the user types, so it cannot be the accessible name.
 */
export interface AuthFieldProps extends ThemedTextInputProps {
  label: string;
  error?: string;
}

export function AuthField({ label, error, ...inputProps }: AuthFieldProps) {
  return (
    <View style={styles.field}>
      <ThemedText
        variant="caption1"
        color={colors.secondaryLabel}
        style={styles.label}
      >
        {label}
      </ThemedText>
      <ThemedTextInput accessibilityLabel={label} {...inputProps} />
      {error ? (
        <ThemedText
          variant="caption1"
          color={colors.systemRed}
          testID={`auth-error-${label}`}
        >
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.xs,
  },
  label: {
    paddingHorizontal: spacing.xs,
  },
});
