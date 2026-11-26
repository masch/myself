import { useLocalSearchParams, useRouter } from "expo-router";
import { AppButton, EmptyState } from "@/components";
import { useSession } from "@/context/session-context";
import { colors, spacing } from "@/theme";
import { StyleSheet } from "react-native";
import {
  backToAppTarget,
  verificationOutcomeFromParams,
  type LinkParams,
} from "./link-outcomes";

export interface VerifyEmailScreenProps {
  /** Test seam: the deep link's own parameters; expo-router supplies them in the app. */
  params?: LinkParams;
}

/**
 * The landing surface of the verification link (S2, S13, S17).
 *
 * The token was already consumed by the endpoint the email pointed at — that request is what
 * flipped `emailVerified` — so this screen reads the one thing the redirect carries: an
 * `error` parameter, or none. It therefore reports rather than verifies, and it reports the
 * truth: an expired or already-used token arrives as an `error` and is never shown as
 * success. Whatever the outcome there is a way back into the app, because a landing page
 * with no exit is the failure mode a deep link makes easy.
 */
export function VerifyEmailScreen({ params }: VerifyEmailScreenProps) {
  const routeParams = useLocalSearchParams();
  const router = useRouter();
  const { user } = useSession();

  const outcome = verificationOutcomeFromParams(params ?? routeParams);
  const backTarget = backToAppTarget(user);
  const verified = outcome.status === "verified";

  return (
    <EmptyState
      testID="verification-outcome"
      icon={
        verified
          ? "sf:checkmark.circle.fill"
          : "sf:exclamationmark.triangle.fill"
      }
      iconColor={verified ? colors.systemGreen : colors.systemOrange}
      iconSize={48}
      title={verified ? "Email verified" : "Verification failed"}
      description={
        verified
          ? "Your email address is verified. You can keep using the app."
          : outcome.message
      }
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

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: colors.systemBackground,
    padding: spacing.xl,
    justifyContent: "center",
  },
});
