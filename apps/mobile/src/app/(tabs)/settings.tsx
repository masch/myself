import {
  AppBottomSheetModal,
  AppButton,
  ChipButton,
  ScreenContainer,
  NativeFieldGroup,
  NativeListItem,
  NativeSwitch,
  NativePicker,
  ThemedText,
} from "@/components";

import { useSession } from "@/context/session-context";
import { signOutAndClearCache } from "@/features/auth/sign-out";
import { resetDatabase } from "@/infrastructure/persistence/database";
import {
  colors,
  fontSizes,
  fontWeights,
  letterSpacings,
  lineHeights,
  typography,
} from "@/theme";
import { useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useState } from "react";
import { Alert, Platform, StyleSheet, View } from "react-native";

// Only import @expo/ui on platforms that fully support it without Compose SlotView crashes
import {
  BottomSheet,
  Column,
  Button as ExpoButton,
  Picker as ExpoPicker,
  Slider as ExpoSlider,
  Switch as ExpoSwitch,
  Text as ExpoText,
  FieldGroup,
  Host,
  ListItem,
} from "@expo/ui";

const THEMES = [
  { id: "system", label: "System Auto" },
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
];

const LANGUAGES = [
  { id: "en", label: "English" },
  { id: "es", label: "Español" },
  { id: "fr", label: "Français" },
];

/**
 * What the screen says when the server could not end the session (T2, S3).
 *
 * The web target is why the rule exists — there the browser owns the cookie and no local
 * code can clear it — but the copy is the same on every platform on purpose: a device that
 * dropped its token while the server kept the session has the same live session waiting for
 * its expiry, so saying "signed out" would be untrue there too.
 */
const SIGN_OUT_INCOMPLETE_MESSAGE =
  "Your session may still be active: the server could not be reached to end it.";
const SIGN_OUT_RETRY_LABEL = "Try again";

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { user, signOut } = useSession();

  // State for controls
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [volume, setVolume] = useState(0.75);
  const [selectedTheme, setSelectedTheme] = useState<string>("system");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");
  const [isAboutSheetOpen, setIsAboutSheetOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutIncomplete, setSignOutIncomplete] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  /**
   * Sign out (S13, S3): clears the stored token, drops the session state, and the root
   * gate then sends this client back to the sign-in screen on its own. The device
   * database is untouched — local rows stay on the device, and the seeded profiles
   * stay in the `user` table even though no UI path reaches them any more.
   *
   * The query cache is cleared by `signOutAndClearCache` in a `finally` of its own
   * (T6c `m2`): it used to be cleared after `await signOut()`, so a sign-out that
   * rejected skipped it and left the previous identity's server state in memory.
   *
   * Since T2 the outcome also says what the server did. When the revoke never reached it,
   * the session is still live — on the web the cookie is the session and nothing local can
   * clear it — so this screen stops offering the ordinary sign-out and says what actually
   * happened, with one control that asks again. The same press does both, because it is the
   * same sign-out.
   */
  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);

    try {
      const outcome = await signOutAndClearCache({
        signOut,
        cache: queryClient,
      });

      if (outcome.local === "failed") {
        console.error("Failed to sign out:", outcome.localError);
        Alert.alert("Error", "Could not sign out. Please try again.");
      }

      if (outcome.revoke === "unreachable") {
        // The session may still be active, so nothing here reads as a completed sign-out.
        console.error(
          "Sign-out did not reach the server, so the session may still be active:",
          outcome.revokeError,
        );
      }
      setSignOutIncomplete(outcome.revoke === "unreachable");

      if (outcome.cache === "partial") {
        // The cache was emptied; what failed is the reset that cancels in-flight refetches
        // first, so a refetch started just before the sign-out may still resolve into it.
        console.error(
          "Sign-out emptied the query cache without cancelling its refetches:",
          outcome.cacheError,
        );
      }
    } finally {
      setIsSigningOut(false);
    }
  };

  /**
   * The label of the Account control: the ordinary sign-out, or the retry once the server
   * could not be reached (T2, S3).
   */
  const signOutActionLabel = isSigningOut
    ? "Signing out…"
    : signOutIncomplete
      ? SIGN_OUT_RETRY_LABEL
      : "Sign out";

  const handleResetDatabase = () => {
    const executeReset = async () => {
      try {
        setIsResetting(true);
        await resetDatabase(db);
        await queryClient.resetQueries();
        queryClient.clear();

        if (Platform.OS === "web") {
          window.alert("Local database reset successfully.");
        } else {
          Alert.alert("Success", "Local database reset successfully.");
        }
      } catch (error) {
        console.error("Failed to reset database:", error);
        if (Platform.OS === "web") {
          window.alert("Failed to reset database. Please check console logs.");
        } else {
          Alert.alert("Error", "Failed to reset database.");
        }
      } finally {
        setIsResetting(false);
      }
    };

    if (Platform.OS === "web") {
      if (
        window.confirm(
          "Are you sure you want to reset the local database? All local reflections, logs, and custom profiles will be erased and default seeds restored.",
        )
      ) {
        void executeReset();
      }
    } else {
      Alert.alert(
        "Reset Local Database",
        "Are you sure you want to reset the database? All local reflections, logs, and custom profiles will be erased and default seeds restored.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Reset Database",
            style: "destructive",
            onPress: () => void executeReset(),
          },
        ],
      );
    }
  };

  // -------------------------------------------------------------------------
  // iOS & Web: Native SwiftUI / @expo/ui Experience
  // -------------------------------------------------------------------------
  if (Platform.OS !== "android") {
    return (
      <ScreenContainer.Tab>
        <Host style={{ flex: 1 }}>
          <FieldGroup>
            {/* Account Section: the session, not a device-local profile switcher */}
            <FieldGroup.Section title="Account">
              <ListItem
                leading={
                  <Image
                    source="sf:person.crop.circle.fill"
                    style={[styles.icon, { tintColor: colors.systemBlue }]}
                  />
                }
                supportingText={user?.email ?? "No email"}
              >
                {user?.name ?? "No user"}
              </ListItem>

              <ListItem
                leading={
                  <Image
                    source={
                      signOutIncomplete
                        ? "sf:exclamationmark.triangle.fill"
                        : "sf:rectangle.portrait.and.arrow.right.fill"
                    }
                    style={[
                      styles.icon,
                      {
                        tintColor: signOutIncomplete
                          ? colors.systemOrange
                          : colors.systemRed,
                      },
                    ]}
                  />
                }
                supportingText={
                  signOutIncomplete
                    ? SIGN_OUT_INCOMPLETE_MESSAGE
                    : "Clears the session stored on this device"
                }
                onPress={handleSignOut}
              >
                {signOutActionLabel}
              </ListItem>
            </FieldGroup.Section>

            {/* Preferences Section */}
            <FieldGroup.Section title="Preferences">
              <ListItem
                leading={
                  <Image
                    source="sf:bell.fill"
                    style={[styles.icon, { tintColor: colors.systemRed }]}
                  />
                }
                trailing={
                  <ExpoSwitch
                    value={notificationsEnabled}
                    onValueChange={setNotificationsEnabled}
                  />
                }
              >
                Push Notifications
              </ListItem>

              <ListItem
                leading={
                  <Image
                    source="sf:faceid"
                    style={[styles.icon, { tintColor: colors.systemGreen }]}
                  />
                }
                trailing={
                  <ExpoSwitch
                    value={biometricsEnabled}
                    onValueChange={setBiometricsEnabled}
                  />
                }
              >
                Face ID / Biometrics
              </ListItem>

              <ListItem
                leading={
                  <Image
                    source="sf:globe"
                    style={[styles.icon, { tintColor: colors.systemBlue }]}
                  />
                }
                trailing={
                  <ExpoPicker
                    selectedValue={selectedLanguage}
                    onValueChange={(val) => setSelectedLanguage(val as string)}
                    appearance="menu"
                  >
                    <ExpoPicker.Item label="English" value="en" />
                    <ExpoPicker.Item label="Español" value="es" />
                    <ExpoPicker.Item label="Français" value="fr" />
                    <ExpoPicker.Item label="Deutsch" value="de" />
                  </ExpoPicker>
                }
              >
                Language
              </ListItem>
            </FieldGroup.Section>

            {/* Appearance Section */}
            <FieldGroup.Section title="Appearance">
              <ListItem
                leading={
                  <Image
                    source="sf:paintbrush.fill"
                    style={[styles.icon, { tintColor: colors.systemPurple }]}
                  />
                }
                trailing={
                  <ExpoPicker
                    selectedValue={selectedTheme}
                    onValueChange={(val) => setSelectedTheme(val as string)}
                    appearance="menu"
                  >
                    <ExpoPicker.Item label="System Auto" value="system" />
                    <ExpoPicker.Item label="Light" value="light" />
                    <ExpoPicker.Item label="Dark" value="dark" />
                  </ExpoPicker>
                }
              >
                Theme
              </ListItem>

              <ListItem
                leading={
                  <Image
                    source="sf:speaker.wave.2.fill"
                    style={[styles.icon, { tintColor: colors.systemOrange }]}
                  />
                }
                supportingText={`Sound volume: ${Math.round(volume * 100)}%`}
              >
                <ExpoSlider
                  value={volume}
                  onValueChange={setVolume}
                  min={0}
                  max={1}
                />
              </ListItem>
            </FieldGroup.Section>

            {/* Privacy & Diagnostics */}
            <FieldGroup.Section title="Privacy & Diagnostics">
              <ListItem
                leading={
                  <Image
                    source="sf:hand.raised.fill"
                    style={[styles.icon, { tintColor: colors.systemOrange }]}
                  />
                }
                trailing={
                  <ExpoSwitch
                    value={analyticsEnabled}
                    onValueChange={setAnalyticsEnabled}
                  />
                }
              >
                Share Analytics
              </ListItem>

              <ListItem
                leading={
                  <Image
                    source="sf:info.circle.fill"
                    style={[styles.icon, { tintColor: colors.systemGray }]}
                  />
                }
                onPress={() => setIsAboutSheetOpen(true)}
              >
                About Myself App
              </ListItem>
            </FieldGroup.Section>

            {/* Developer & Design System */}
            <FieldGroup.Section title="Developer & Design System">
              <ListItem
                leading={
                  <Image
                    source="sf:paintpalette.fill"
                    style={[styles.icon, { tintColor: colors.systemBlue }]}
                  />
                }
                supportingText="Living catalog of tokens, primitives, and controls"
                onPress={() => router.push("/dev-showcase")}
              >
                Design System Showcase
              </ListItem>
            </FieldGroup.Section>

            {/* Database & Storage */}
            <FieldGroup.Section title="Database & Storage">
              <ListItem
                leading={
                  <Image
                    source="sf:trash.fill"
                    style={[styles.icon, { tintColor: colors.systemRed }]}
                  />
                }
                supportingText="Erases all local data and restores default seed data"
                onPress={handleResetDatabase}
              >
                Reset Local Database
              </ListItem>
            </FieldGroup.Section>
          </FieldGroup>

          {/* Native BottomSheet for About Modal */}
          <BottomSheet
            isPresented={isAboutSheetOpen}
            onDismiss={() => setIsAboutSheetOpen(false)}
            snapPoints={["half"]}
          >
            <Column>
              <ExpoText>Myself App - Version 1.0.0</ExpoText>
              <ExpoText>
                Local-first SQLite database with pre-meditation reading
                passages, multi-moment timer, and native @expo/ui controls.
              </ExpoText>
              <ExpoButton onPress={() => setIsAboutSheetOpen(false)}>
                Done
              </ExpoButton>
            </Column>
          </BottomSheet>
        </Host>
      </ScreenContainer.Tab>
    );
  }

  // -------------------------------------------------------------------------
  // Android: High-Performance, Crash-Free Native System UI
  // -------------------------------------------------------------------------
  return (
    <ScreenContainer.Scroll>
      {/* 1. Account Section */}
      <View style={styles.section}>
        <ThemedText
          variant="caption1"
          color={colors.secondaryLabel}
          style={styles.sectionTitle}
        >
          ACCOUNT
        </ThemedText>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.secondarySystemBackground },
          ]}
        >
          <View style={styles.row}>
            <Image
              source="sf:person.crop.circle.fill"
              style={[styles.rowIcon, { tintColor: colors.systemBlue }]}
            />
            <View style={styles.rowContent}>
              <ThemedText variant="body" style={styles.rowTitle}>
                {user?.name ?? "No user"}
              </ThemedText>
              <ThemedText
                variant="caption1"
                color={colors.secondaryLabel}
                style={styles.rowSubtitle}
              >
                {user?.email ?? "No email"}
              </ThemedText>
            </View>
          </View>

          <View style={styles.divider} />
          <View style={styles.actionRow}>
            {/* Sign-out replaces the device-local profile switcher (S13). The seeded
                profiles and their rows stay in the local database; no UI path reaches
                them any more, which is recorded in L27.

                A sign-out the server did not end keeps this screen up (T2, S3): what is
                offered is the retry, not the ordinary sign-out, and the text says why. */}
            {signOutIncomplete ? (
              <View style={styles.signOutIncomplete}>
                <ThemedText
                  variant="caption1"
                  color={colors.systemOrange}
                  style={styles.signOutNotice}
                  testID="sign-out-incomplete"
                >
                  {SIGN_OUT_INCOMPLETE_MESSAGE}
                </ThemedText>
                <ChipButton
                  title={signOutActionLabel}
                  icon="sf:arrow.clockwise"
                  variant="destructive"
                  disabled={isSigningOut}
                  onPress={handleSignOut}
                />
              </View>
            ) : (
              <ChipButton
                title={signOutActionLabel}
                icon="sf:rectangle.portrait.and.arrow.right.fill"
                variant="destructive"
                disabled={isSigningOut}
                onPress={handleSignOut}
              />
            )}
          </View>
        </View>
      </View>

      {/* 2. Preferences Section */}
      <NativeFieldGroup.Section title="Preferences" style={styles.section}>
        <NativeListItem
          leading={
            <Image
              source="sf:bell.fill"
              style={[styles.rowIcon, { tintColor: colors.systemRed }]}
            />
          }
          supportingText="Daily reminder for meditation practice"
          trailing={
            <NativeSwitch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              accessibilityLabel="Push Notifications"
            />
          }
        >
          Push Notifications
        </NativeListItem>

        <NativeListItem
          leading={
            <Image
              source="sf:faceid"
              style={[styles.rowIcon, { tintColor: colors.systemGreen }]}
            />
          }
          supportingText="Protect personal journals and reflections"
          trailing={
            <NativeSwitch
              value={biometricsEnabled}
              onValueChange={setBiometricsEnabled}
              accessibilityLabel="Biometrics / Face ID"
            />
          }
        >
          Biometrics / Face ID
        </NativeListItem>

        <NativeListItem
          leading={
            <Image
              source="sf:globe"
              style={[styles.rowIcon, { tintColor: colors.systemBlue }]}
            />
          }
          trailing={
            <NativePicker
              value={selectedLanguage}
              onValueChange={setSelectedLanguage}
              options={LANGUAGES.map((l) => ({ label: l.label, value: l.id }))}
            />
          }
        >
          Language
        </NativeListItem>
      </NativeFieldGroup.Section>

      {/* 3. Appearance Section */}
      <NativeFieldGroup.Section title="Appearance" style={styles.section}>
        <NativeListItem
          leading={
            <Image
              source="sf:paintbrush.fill"
              style={[styles.rowIcon, { tintColor: colors.systemPurple }]}
            />
          }
          trailing={
            <NativePicker
              value={selectedTheme}
              onValueChange={setSelectedTheme}
              options={THEMES.map((t) => ({ label: t.label, value: t.id }))}
            />
          }
        >
          Theme
        </NativeListItem>
      </NativeFieldGroup.Section>

      {/* 4. Privacy & Info */}
      <NativeFieldGroup.Section title="Privacy & Info" style={styles.section}>
        <NativeListItem
          leading={
            <Image
              source="sf:hand.raised.fill"
              style={[styles.rowIcon, { tintColor: colors.systemOrange }]}
            />
          }
          supportingText="Help improve meditation features"
          trailing={
            <NativeSwitch
              value={analyticsEnabled}
              onValueChange={setAnalyticsEnabled}
              accessibilityLabel="Share Analytics"
            />
          }
        >
          Share Analytics
        </NativeListItem>

        <NativeListItem
          leading={
            <Image
              source="sf:info.circle.fill"
              style={[styles.rowIcon, { tintColor: colors.systemGray }]}
            />
          }
          supportingText="Version 1.0.0 (Expo SDK 57)"
          trailing={
            <ChipButton
              title="Details"
              variant="secondary"
              onPress={() => setIsAboutSheetOpen(true)}
            />
          }
        >
          About Myself App
        </NativeListItem>
      </NativeFieldGroup.Section>

      {/* Developer & Design System */}
      <NativeFieldGroup.Section
        title="Developer & Design System"
        style={styles.section}
      >
        <NativeListItem
          leading={
            <Image
              source="sf:paintpalette.fill"
              style={[styles.rowIcon, { tintColor: colors.systemBlue }]}
            />
          }
          supportingText="Living catalog of tokens, primitives, and controls"
          trailing={
            <ChipButton
              title="Open"
              variant="secondary"
              onPress={() => router.push("/dev-showcase")}
            />
          }
          onPress={() => router.push("/dev-showcase")}
        >
          Design System Showcase
        </NativeListItem>
      </NativeFieldGroup.Section>

      {/* 5. Database & Storage */}
      <NativeFieldGroup.Section
        title="Database & Storage"
        style={styles.section}
      >
        <NativeListItem
          leading={
            <Image
              source="sf:trash.fill"
              style={[styles.rowIcon, { tintColor: colors.systemRed }]}
            />
          }
          supportingText="Erases all local data and restores default seeds"
          trailing={
            <ChipButton
              title={isResetting ? "Resetting..." : "Reset"}
              variant="destructive"
              disabled={isResetting}
              onPress={handleResetDatabase}
            />
          }
        >
          Reset Local Database
        </NativeListItem>
      </NativeFieldGroup.Section>

      {/* Modal for About (Android / Web) */}
      <AppBottomSheetModal.Scroll
        visible={isAboutSheetOpen}
        onClose={() => setIsAboutSheetOpen(false)}
        maxWidth={460}
      >
        <View style={styles.aboutModalCard}>
          <Image
            source="sf:app.badge.checkmark.fill"
            style={[styles.aboutIcon, { tintColor: colors.systemBlue }]}
          />
          <ThemedText variant="headline" style={styles.aboutTitle}>
            Myself App
          </ThemedText>
          <ThemedText
            variant="caption1"
            color={colors.secondaryLabel}
            style={styles.aboutVersion}
          >
            Version 1.0.0 (Expo SDK 57)
          </ThemedText>
          <ThemedText
            variant="body"
            color={colors.secondaryLabel}
            style={styles.aboutDescription}
          >
            Local-first SQLite database with pre-meditation reading passages,
            multi-moment practice timer, and clean atomic design.
          </ThemedText>

          <View style={{ width: "100%", marginTop: 16 }}>
            <AppButton
              title="Close"
              variant="secondary"
              onPress={() => setIsAboutSheetOpen(false)}
            />
          </View>
        </View>
      </AppBottomSheetModal.Scroll>
    </ScreenContainer.Scroll>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  icon: {
    width: 24,
    height: 24,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: typography.caption1.fontSize,
    fontWeight: fontWeights.semibold,
    letterSpacing: letterSpacings.sectionTitle,
    paddingHorizontal: 4,
  },
  card: {
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 16,
    borderCurve: "continuous",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  rowIcon: {
    width: 24,
    height: 24,
  },
  rowContent: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.medium,
  },
  rowSubtitle: {
    fontSize: fontSizes.sm,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.systemGray20,
    marginLeft: 36,
  },
  actionRow: {
    paddingVertical: 10,
    paddingLeft: 36,
  },
  signOutIncomplete: {
    gap: 8,
    alignItems: "flex-start",
  },
  signOutNotice: {
    fontSize: fontSizes.sm,
  },
  aboutModalCard: {
    alignItems: "center",
    paddingVertical: 28,
  },
  aboutIcon: {
    width: 48,
    height: 48,
  },
  aboutTitle: {
    fontSize: typography.title2.fontSize,
    fontWeight: fontWeights.bold,
    marginTop: 8,
  },
  aboutVersion: {
    fontSize: fontSizes.sm,
    marginTop: 2,
  },
  aboutDescription: {
    fontSize: fontSizes.md,
    textAlign: "center",
    lineHeight: lineHeights.lg,
    marginTop: 8,
  },
});
