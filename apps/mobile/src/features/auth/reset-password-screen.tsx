import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  AppButton,
  EmptyState,
  ScreenContainer,
  ThemedText,
} from "@/components";
import { useSession } from "@/context/session-context";
import { passwordResetService } from "@/infrastructure/auth/password-reset-service-instance";
import { describeAuthFailure } from "@/infrastructure/auth/session-service";
import type {
  PasswordResetOutcome,
  PasswordResetService,
} from "@/infrastructure/auth/password-reset-service";
import { colors, spacing } from "@/theme";
import { AuthField } from "./auth-field";
import {
  backToAppTarget,
  resetTokenFromParams,
  type LinkParams,
} from "./link-outcomes";
import {
  PASSWORD_MIN_LENGTH,
  validateNewPasswordForm,
  type AuthFormErrors,
} from "./validation";

export interface ResetPasswordScreenProps {
  /** Test seam: the service that completes the reset. */
  service?: PasswordResetService;
  /** Test seam: the deep link's own parameters; expo-router supplies them in the app. */
  params?: LinkParams;
}

/**
 * Completes a reset from the deep link that carries the token (S2, S13).
 *
 * The token comes from `myself://reset-password?token=…`, which is where Better Auth's
 * `GET /reset-password/:token` sends the browser after `redirectTo`. Three failures have to
 * be reachable and readable rather than a blank screen: a link with no token at all, a token
 * the server no longer accepts (expired, or already used — the library consumes it), and a
 * new password the rules refuse. Whatever happens, the way out is a control.
 */
export function ResetPasswordScreen({
  service = passwordResetService,
  params,
}: ResetPasswordScreenProps) {
  const routeParams = useLocalSearchParams();
  const router = useRouter();
  const { user } = useSession();
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<AuthFormErrors>({});
  const [outcome, setOutcome] = useState<PasswordResetOutcome | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const token = resetTokenFromParams(params ?? routeParams);
  const backTarget = backToAppTarget(user);

  const handleSubmit = async () => {
    if (isSubmitting || !token) return;

    const result = validateNewPasswordForm({ password });
    if (!result.ok) {
      setErrors(result.errors);
      setOutcome(null);
      return;
    }

    setErrors({});
    setOutcome(null);
    setIsSubmitting(true);
    try {
      setOutcome(await service.complete(token, result.values.password));
    } catch {
      // Same as the request above: a rejection here would leave the link dead with no
      // message, and a reset that did not happen must never look like one that did.
      setOutcome({ status: "failed", message: describeAuthFailure(null) });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <EmptyState
        testID="reset-link-problem"
        icon="sf:exclamationmark.triangle.fill"
        iconColor={colors.systemOrange}
        iconSize={48}
        title="This reset link is incomplete"
        description="It is missing the token that proves the request, so there is nothing to reset. Request a new link from the sign-in screen."
        action={
          <AppButton
            title="Continue"
            variant="primary"
            onPress={() => router.replace(backTarget)}
          />
        }
        style={styles.fullScreen}
      />
    );
  }

  if (outcome?.status === "reset") {
    return (
      <EmptyState
        testID="reset-complete"
        icon="sf:checkmark.circle.fill"
        iconColor={colors.systemGreen}
        iconSize={48}
        title="Password changed"
        description="Every other session of your account was signed out. Sign in with the new password to continue."
        action={
          <AppButton
            title="Continue"
            variant="primary"
            onPress={() => router.replace("/sign-in")}
          />
        }
        style={styles.fullScreen}
      />
    );
  }

  return (
    <ScreenContainer.Scroll>
      <View style={styles.header}>
        <ThemedText variant="largeTitle">Choose a new password</ThemedText>
        <ThemedText variant="body" color={colors.secondaryLabel}>
          Signing in anywhere else will need the new password.
        </ThemedText>
      </View>

      <AuthField
        label="New password"
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
        title={isSubmitting ? "Saving…" : "Set new password"}
        variant="primary"
        disabled={isSubmitting}
        onPress={handleSubmit}
      />

      <AppButton
        title="Continue"
        variant="secondary"
        onPress={() => router.replace(backTarget)}
      />
    </ScreenContainer.Scroll>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  fullScreen: {
    flex: 1,
    backgroundColor: colors.systemBackground,
    padding: spacing.xl,
    justifyContent: "center",
  },
});
