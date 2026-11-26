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
import { validateSignInForm, type AuthFormErrors } from "./validation";

/**
 * Email + password sign-in (S13).
 *
 * There is deliberately no Google button yet: S8's federated path needs a native
 * module and real per-platform client IDs that do not exist in this repository, and a
 * button that cannot work is worse than no button. Where it goes: inside this form,
 * between the password field and the submit button, calling
 * `signIn.social({ provider: "google", idToken })` with a token obtained from that
 * native module — it needs no other change here, because the ID-token exchange returns
 * the same `set-auth-token` header as password sign-in.
 */
export function SignInScreen() {
  const { signIn } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<AuthFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (isSubmitting) return;

    const result = validateSignInForm({ email, password });
    if (!result.ok) {
      setErrors(result.errors);
      setFormError(null);
      return;
    }

    setErrors({});
    setFormError(null);
    setIsSubmitting(true);
    try {
      await signIn(result.values);
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
        <ThemedText variant="largeTitle">Sign in</ThemedText>
        <ThemedText variant="body" color={colors.secondaryLabel}>
          Use your email and password to continue.
        </ThemedText>
      </View>

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
        placeholder="Your password"
        secureTextEntry
        autoCapitalize="none"
        autoComplete="current-password"
        textContentType="password"
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
        title={isSubmitting ? "Signing in…" : "Sign in"}
        variant="primary"
        disabled={isSubmitting}
        onPress={handleSubmit}
      />

      {/*
        The reset request is one press from the only screen a signed-out user can reach
        (S2, S13). Its form never says whether the address exists, and a server with no
        email sender says so instead of pretending it sent a link.
      */}
      <AuthSwitchLink
        href="/forgot-password"
        prompt="Forgot your password?"
        label="Reset it"
      />

      <AuthSwitchLink
        href="/sign-up"
        prompt="No account yet?"
        label="Create one"
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
