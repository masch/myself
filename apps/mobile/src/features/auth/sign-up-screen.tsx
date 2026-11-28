import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { AppButton, ScreenContainer, ThemedText } from "@/components";
import { useSession } from "@/context/session-context";
import {
  AuthenticationError,
  describeAuthFailure,
} from "@/infrastructure/auth/session-service";
import { colors, spacing } from "@/theme";
import { AuthField } from "./auth-field";
import { AuthSwitchLink } from "./auth-switch-link";
import {
  PASSWORD_MIN_LENGTH,
  validateSignUpForm,
  type AuthFormErrors,
} from "./validation";

/**
 * Email + password sign-up (S13).
 *
 * The name is part of the form because the identity model requires one: the shared
 * user schema rejects a blank name at the write boundary (Better Auth only type-checks
 * it), so a sign-up that omitted it would create an account whose row no read can map.
 *
 * The Google button belongs here and on the sign-in form, in the same place — after
 * the password field — once S8's native module and client IDs exist.
 */
export function SignUpScreen() {
  const { signUp } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<AuthFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (isSubmitting) return;

    const result = validateSignUpForm({ name, email, password });
    if (!result.ok) {
      setErrors(result.errors);
      setFormError(null);
      return;
    }

    setErrors({});
    setFormError(null);
    setIsSubmitting(true);
    try {
      await signUp(result.values);
    } catch (error) {
      setFormError(
        error instanceof AuthenticationError
          ? error.message
          : describeAuthFailure(null),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenContainer.Scroll>
      <View style={styles.header}>
        <ThemedText variant="largeTitle">Create account</ThemedText>
        <ThemedText variant="body" color={colors.secondaryLabel}>
          Your practice data stays on this device; the account identifies you to
          the content service.
        </ThemedText>
      </View>

      <AuthField
        label="Full name"
        value={name}
        onChangeText={setName}
        error={errors.name}
        placeholder="Ada Lovelace"
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
      />

      <AuthField
        label="Email address"
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
      />

      <AuthField
        label="Password"
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        onSubmitShortcut={handleSubmit}
      />

      {formError ? (
        <ThemedText
          variant="callout"
          color={colors.systemRed}
          testID="auth-error"
        >
          {formError}
        </ThemedText>
      ) : null}

      <AppButton
        title={isSubmitting ? "Creating account…" : "Create account"}
        variant="primary"
        disabled={isSubmitting}
        onPress={handleSubmit}
      />

      <AuthSwitchLink
        href="/sign-in"
        prompt="Already have an account?"
        label="Sign in"
      />
    </ScreenContainer.Scroll>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
});
