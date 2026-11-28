import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { AppButton, ScreenContainer, ThemedText } from "@/components";
import { useSession } from "@/context/session-context";
import {
  GoogleSignInError,
  type GoogleIdTokenProvider,
} from "@/features/auth/google/google-id-token-provider.contract";
import { googleIdTokenProvider } from "@/features/auth/google/google-id-token-provider";
import {
  AuthenticationError,
  describeAuthFailure,
} from "@/infrastructure/auth/session-service";
import { colors, spacing } from "@/theme";
import { AuthField } from "./auth-field";
import { AuthSwitchLink } from "./auth-switch-link";
import { validateSignInForm, type AuthFormErrors } from "./validation";

/**
 * Email + password sign-in, plus Google where Google can actually complete (S4, S13).
 *
 * The Google control exists on the screen — between the submit button and the links — but
 * only renders when the platform's `GoogleIdTokenProvider` reports `available`, which is
 * driven by that platform's own client ID and nothing else. On native today that answer is
 * always `false` (no client ID, no module that mints an ID token), so this screen renders
 * exactly what it rendered before: no dead button. On web, a build with
 * `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` set renders it, and pressing it sends the token
 * through `signIn`, the same transition the email form uses — the exchange returns the
 * same `set-auth-token` header, so nothing about the session path is duplicated here.
 */
export interface SignInScreenProps {
  /**
   * Test seam: where this platform's ID token comes from.
   *
   * Defaults to the bundler-resolved platform module, so the app's tree never passes it;
   * a test can hand in a fake and prove the wiring without touching Google's script.
   */
  googleProvider?: GoogleIdTokenProvider;
}

/**
 * The text a person sees for a failed press.
 *
 * Both errors carry a message written for a person: `AuthenticationError` for a refusal
 * from this app's server, `GoogleSignInError` for a Google window that never produced a
 * token. Anything else is a bug and gets the generic line rather than a library message.
 */
function describeSignInFailure(error: unknown): string {
  if (error instanceof AuthenticationError) return error.message;
  if (error instanceof GoogleSignInError) return error.message;
  return describeAuthFailure(null);
}

export function SignInScreen({
  googleProvider = googleIdTokenProvider,
}: SignInScreenProps = {}) {
  const { signIn } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<AuthFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

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
      setFormError(describeSignInFailure(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Asks the platform for one ID token, then signs in with it through `signIn` (S4).
   *
   * A press that produces no token signs nobody in: the provider's refusal is shown in the
   * same error element the email form uses, and the identity in the session is untouched.
   */
  const handleGooglePress = async () => {
    if (isSubmitting || isGoogleSubmitting) return;

    setErrors({});
    setFormError(null);
    setIsGoogleSubmitting(true);
    try {
      await signIn({ idToken: await googleProvider.requestIdToken() });
    } catch (error) {
      setFormError(describeSignInFailure(error));
    } finally {
      setIsGoogleSubmitting(false);
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
        Rendered only when this platform can actually complete a Google sign-in (S4).
        `available` is the whole gate: nothing else about the platform may decide it, and
        an unconfigured build renders nothing here at all.
      */}
      {googleProvider.available ? (
        <AppButton
          title={isGoogleSubmitting ? "Connecting…" : "Continue with Google"}
          variant="secondary"
          disabled={isSubmitting || isGoogleSubmitting}
          onPress={handleGooglePress}
        />
      ) : null}

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
