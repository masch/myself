import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { AppButton, ScreenContainer, ThemedText } from "@/components";
import { passwordResetService } from "@/infrastructure/auth/password-reset-service-instance";
import type {
  PasswordResetRequestOutcome,
  PasswordResetService,
} from "@/infrastructure/auth/password-reset-service";
import { colors, spacing } from "@/theme";
import { AuthField } from "./auth-field";
import { AuthSwitchLink } from "./auth-switch-link";
import { validateForgotPasswordForm, type AuthFormErrors } from "./validation";

export interface ForgotPasswordScreenProps {
  /** Test seam: the service the form asks for the link. */
  service?: PasswordResetService;
}

/**
 * Requests the reset link (S2, S13).
 *
 * Two properties are deliberate. The form never says whether an address exists — the same
 * sentence is shown for an account and for a stranger, and the API answers identically and
 * in the same time. And a server with no email sender says so: T4's deployed environment
 * has no sender, the request is refused, and a cheerful "check your email" would leave the
 * user waiting for a mail nobody sent.
 */
export function ForgotPasswordScreen({
  service = passwordResetService,
}: ForgotPasswordScreenProps) {
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<AuthFormErrors>({});
  const [outcome, setOutcome] = useState<PasswordResetRequestOutcome | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (isSubmitting) return;

    const result = validateForgotPasswordForm({ email });
    if (!result.ok) {
      setErrors(result.errors);
      setOutcome(null);
      return;
    }

    setErrors({});
    setOutcome(null);
    setIsSubmitting(true);
    try {
      setOutcome(await service.request(result.values.email));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenContainer.Scroll>
      <View style={styles.header}>
        <ThemedText variant="largeTitle">Reset your password</ThemedText>
        <ThemedText variant="body" color={colors.secondaryLabel}>
          We can email you a link to choose a new password.
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
        onSubmitShortcut={handleSubmit}
      />

      {outcome?.status === "sent" ? (
        <ThemedText
          variant="callout"
          color={colors.secondaryLabel}
          testID="reset-request-sent"
        >
          If an account exists for that address, we have emailed a link to
          choose a new password. The link expires in an hour.
        </ThemedText>
      ) : null}

      {outcome?.status === "disabled" ? (
        <ThemedText
          variant="callout"
          color={colors.systemOrange}
          testID="reset-request-disabled"
        >
          {outcome.message}
        </ThemedText>
      ) : null}

      {outcome?.status === "failed" ? (
        <ThemedText
          variant="callout"
          color={colors.systemRed}
          testID="auth-error"
        >
          {outcome.message}
        </ThemedText>
      ) : null}

      <AppButton
        title={isSubmitting ? "Sending…" : "Send reset link"}
        variant="primary"
        disabled={isSubmitting}
        onPress={handleSubmit}
      />

      <AuthSwitchLink
        href="/sign-in"
        prompt="Remembered your password?"
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
