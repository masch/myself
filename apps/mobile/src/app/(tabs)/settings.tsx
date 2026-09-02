import { useState } from "react";
import {
  Platform,
  View,
  StyleSheet,
  ScrollView,
  Text,
  Alert,
  TextInput,
  Switch as RNSwitch,
  Modal,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/auth-context";
import { AppButton, ChipButton, IconButton } from "@/components";
import { colors } from "@/theme/colors";

// Only import @expo/ui on platforms that fully support it without Compose SlotView crashes
import {
  Host,
  FieldGroup,
  ListItem,
  Switch as ExpoSwitch,
  Slider as ExpoSlider,
  Picker as ExpoPicker,
  BottomSheet,
  Column,
  Button as ExpoButton,
  Text as ExpoText,
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

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser, users, switchUser, registerUser } = useAuth();

  // State for controls
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [volume, setVolume] = useState(0.75);
  const [selectedTheme, setSelectedTheme] = useState<string>("system");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");
  const [isAboutSheetOpen, setIsAboutSheetOpen] = useState(false);
  const [isNewUserSheetOpen, setIsNewUserSheetOpen] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");

  const handleCreateUser = async () => {
    if (!newUserName.trim() || !newUserEmail.trim()) {
      Alert.alert("Required fields", "Please enter both name and email.");
      return;
    }

    try {
      await registerUser(newUserName.trim(), newUserEmail.trim());
      setNewUserName("");
      setNewUserEmail("");
      setIsNewUserSheetOpen(false);
    } catch (error) {
      console.error("Failed to create user:", error);
      Alert.alert("Error", "Email must be unique.");
    }
  };

  // -------------------------------------------------------------------------
  // iOS & Web: Native SwiftUI / @expo/ui Experience
  // -------------------------------------------------------------------------
  if (Platform.OS !== "android") {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.systemBackground,
            paddingTop: insets.top + 8,
            paddingBottom: insets.bottom + 8,
          },
        ]}
      >
        <Host style={{ flex: 1 }}>
          <FieldGroup>
            {/* Active Profile Section */}
            <FieldGroup.Section title="Active Profile">
              <ListItem
                leading={
                  <Image
                    source="sf:person.crop.circle.fill"
                    style={[styles.icon, { tintColor: colors.systemBlue }]}
                  />
                }
                supportingText={currentUser?.email ?? "No email"}
              >
                {currentUser?.name ?? "No user"}
              </ListItem>

              {users.length > 1 && (
                <ListItem
                  leading={
                    <Image
                      source="sf:person.2.fill"
                      style={[styles.icon, { tintColor: colors.systemGreen }]}
                    />
                  }
                  trailing={
                    <ExpoPicker
                      selectedValue={currentUser?.id ?? ""}
                      onValueChange={(val) => switchUser(String(val))}
                      appearance="menu"
                    >
                      {users.map((u) => (
                        <ExpoPicker.Item
                          key={u.id}
                          label={u.name}
                          value={u.id}
                        />
                      ))}
                    </ExpoPicker>
                  }
                >
                  Switch Account
                </ListItem>
              )}

              <ListItem
                leading={
                  <Image
                    source="sf:person.badge.plus"
                    style={[styles.icon, { tintColor: colors.systemBlue }]}
                  />
                }
                onPress={() => setIsNewUserSheetOpen(true)}
              >
                Add New User Account
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
          </FieldGroup>

          {/* Native BottomSheet for New User */}
          <BottomSheet
            isPresented={isNewUserSheetOpen}
            onDismiss={() => setIsNewUserSheetOpen(false)}
            snapPoints={["half"]}
          >
            <Column>
              <ExpoText>Create User Profile</ExpoText>
              <View style={styles.sheetInputWrapper}>
                <TextInput
                  placeholder="Full Name (e.g. Maria Perez)"
                  placeholderTextColor={colors.secondaryLabel}
                  value={newUserName}
                  onChangeText={setNewUserName}
                  style={[
                    styles.sheetInput,
                    {
                      color: colors.label,
                      borderColor: "rgba(142, 142, 147, 0.3)",
                    },
                  ]}
                />
                <TextInput
                  placeholder="Email (e.g. maria@example.com)"
                  placeholderTextColor={colors.secondaryLabel}
                  value={newUserEmail}
                  onChangeText={setNewUserEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={[
                    styles.sheetInput,
                    {
                      color: colors.label,
                      borderColor: "rgba(142, 142, 147, 0.3)",
                    },
                  ]}
                />
              </View>
              <ExpoButton onPress={handleCreateUser}>
                Create & Switch
              </ExpoButton>
            </Column>
          </BottomSheet>

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
      </View>
    );
  }

  // -------------------------------------------------------------------------
  // Android: High-Performance, Crash-Free Native System UI
  // -------------------------------------------------------------------------
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.systemBackground }]}
      contentContainerStyle={[
        styles.contentContainer,
        {
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 32,
        },
      ]}
      contentInsetAdjustmentBehavior="automatic"
    >
      {/* 1. Account Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.secondaryLabel }]}>
          ACTIVE PROFILE
        </Text>
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
              <Text style={[styles.rowTitle, { color: colors.label }]}>
                {currentUser?.name ?? "No user"}
              </Text>
              <Text
                style={[styles.rowSubtitle, { color: colors.secondaryLabel }]}
              >
                {currentUser?.email ?? "No email"}
              </Text>
            </View>
          </View>

          {users.length > 1 && (
            <>
              <View style={styles.divider} />
              <View style={styles.accountsContainer}>
                <Text
                  style={[styles.subheading, { color: colors.secondaryLabel }]}
                >
                  Switch Account:
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipsRow}
                >
                  {users.map((u) => {
                    const isSelected = u.id === currentUser?.id;
                    return (
                      <ChipButton
                        key={u.id}
                        title={u.name}
                        icon="sf:person.fill"
                        variant={isSelected ? "blue" : "secondary"}
                        onPress={() => switchUser(u.id)}
                      />
                    );
                  })}
                </ScrollView>
              </View>
            </>
          )}

          <View style={styles.divider} />
          <View style={styles.actionRow}>
            <ChipButton
              title="+ Add New User Profile"
              variant="blue"
              onPress={() => setIsNewUserSheetOpen(true)}
            />
          </View>
        </View>
      </View>

      {/* 2. Preferences Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.secondaryLabel }]}>
          PREFERENCES
        </Text>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.secondarySystemBackground },
          ]}
        >
          <View style={styles.row}>
            <Image
              source="sf:bell.fill"
              style={[styles.rowIcon, { tintColor: colors.systemRed }]}
            />
            <View style={styles.rowContent}>
              <Text style={[styles.rowTitle, { color: colors.label }]}>
                Push Notifications
              </Text>
              <Text
                style={[styles.rowSubtitle, { color: colors.secondaryLabel }]}
              >
                Daily reminder for meditation practice
              </Text>
            </View>
            <RNSwitch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{
                false: "rgba(142, 142, 147, 0.3)",
                true: colors.systemGreen as any,
              }}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Image
              source="sf:faceid"
              style={[styles.rowIcon, { tintColor: colors.systemGreen }]}
            />
            <View style={styles.rowContent}>
              <Text style={[styles.rowTitle, { color: colors.label }]}>
                Biometrics / Face ID
              </Text>
              <Text
                style={[styles.rowSubtitle, { color: colors.secondaryLabel }]}
              >
                Protect personal journals and reflections
              </Text>
            </View>
            <RNSwitch
              value={biometricsEnabled}
              onValueChange={setBiometricsEnabled}
              trackColor={{
                false: "rgba(142, 142, 147, 0.3)",
                true: colors.systemGreen as any,
              }}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.selectorRow}>
            <View style={styles.selectorHeader}>
              <Image
                source="sf:globe"
                style={[styles.rowIcon, { tintColor: colors.systemBlue }]}
              />
              <Text style={[styles.rowTitle, { color: colors.label }]}>
                Language
              </Text>
            </View>
            <View style={styles.chipsRow}>
              {LANGUAGES.map((lang) => {
                const isSelected = selectedLanguage === lang.id;
                return (
                  <ChipButton
                    key={lang.id}
                    title={lang.label}
                    variant={isSelected ? "blue" : "secondary"}
                    onPress={() => setSelectedLanguage(lang.id)}
                  />
                );
              })}
            </View>
          </View>
        </View>
      </View>

      {/* 3. Appearance Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.secondaryLabel }]}>
          APPEARANCE
        </Text>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.secondarySystemBackground },
          ]}
        >
          <View style={styles.selectorRow}>
            <View style={styles.selectorHeader}>
              <Image
                source="sf:paintbrush.fill"
                style={[styles.rowIcon, { tintColor: colors.systemPurple }]}
              />
              <Text style={[styles.rowTitle, { color: colors.label }]}>
                Theme
              </Text>
            </View>
            <View style={styles.chipsRow}>
              {THEMES.map((theme) => {
                const isSelected = selectedTheme === theme.id;
                return (
                  <ChipButton
                    key={theme.id}
                    title={theme.label}
                    variant={isSelected ? "purple" : "secondary"}
                    onPress={() => setSelectedTheme(theme.id)}
                  />
                );
              })}
            </View>
          </View>
        </View>
      </View>

      {/* 4. Privacy & Info */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.secondaryLabel }]}>
          PRIVACY & DIAGNOSTICS
        </Text>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.secondarySystemBackground },
          ]}
        >
          <View style={styles.row}>
            <Image
              source="sf:hand.raised.fill"
              style={[styles.rowIcon, { tintColor: colors.systemOrange }]}
            />
            <View style={styles.rowContent}>
              <Text style={[styles.rowTitle, { color: colors.label }]}>
                Share Analytics
              </Text>
              <Text
                style={[styles.rowSubtitle, { color: colors.secondaryLabel }]}
              >
                Help improve meditation features
              </Text>
            </View>
            <RNSwitch
              value={analyticsEnabled}
              onValueChange={setAnalyticsEnabled}
              trackColor={{
                false: "rgba(142, 142, 147, 0.3)",
                true: colors.systemGreen as any,
              }}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Image
              source="sf:info.circle.fill"
              style={[styles.rowIcon, { tintColor: colors.systemGray }]}
            />
            <View style={styles.rowContent}>
              <Text style={[styles.rowTitle, { color: colors.label }]}>
                About Myself App
              </Text>
              <Text
                style={[styles.rowSubtitle, { color: colors.secondaryLabel }]}
              >
                Version 1.0.0 (Expo SDK 57)
              </Text>
            </View>
            <ChipButton
              title="Details"
              variant="secondary"
              onPress={() => setIsAboutSheetOpen(true)}
            />
          </View>
        </View>
      </View>

      {/* Modal for New User (Android) */}
      <Modal
        visible={isNewUserSheetOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsNewUserSheetOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.systemBackground },
            ]}
          >
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: colors.label }]}>
                Create User Profile
              </Text>
              <IconButton
                icon="sf:xmark"
                color={colors.secondaryLabel}
                size="small"
                onPress={() => setIsNewUserSheetOpen(false)}
              />
            </View>

            <View style={styles.modalBody}>
              <TextInput
                placeholder="Full Name (e.g. Maria Perez)"
                placeholderTextColor={colors.secondaryLabel}
                value={newUserName}
                onChangeText={setNewUserName}
                style={[
                  styles.modalInput,
                  {
                    color: colors.label,
                    borderColor: "rgba(142, 142, 147, 0.3)",
                  },
                ]}
              />
              <TextInput
                placeholder="Email (e.g. maria@example.com)"
                placeholderTextColor={colors.secondaryLabel}
                value={newUserEmail}
                onChangeText={setNewUserEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                style={[
                  styles.modalInput,
                  {
                    color: colors.label,
                    borderColor: "rgba(142, 142, 147, 0.3)",
                  },
                ]}
              />
            </View>

            <AppButton
              title="Create & Switch"
              variant="primary"
              onPress={handleCreateUser}
            />
          </View>
        </View>
      </Modal>

      {/* Modal for About (Android) */}
      <Modal
        visible={isAboutSheetOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsAboutSheetOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              styles.aboutModalCard,
              { backgroundColor: colors.systemBackground },
            ]}
          >
            <Image
              source="sf:app.badge.checkmark.fill"
              style={[styles.aboutIcon, { tintColor: colors.systemBlue }]}
            />
            <Text style={[styles.aboutTitle, { color: colors.label }]}>
              Myself App
            </Text>
            <Text
              style={[styles.aboutVersion, { color: colors.secondaryLabel }]}
            >
              Version 1.0.0 (Expo SDK 57)
            </Text>
            <Text
              style={[
                styles.aboutDescription,
                { color: colors.secondaryLabel },
              ]}
            >
              Local-first SQLite database with pre-meditation reading passages,
              multi-moment practice timer, and clean atomic design.
            </Text>

            <AppButton
              title="Close"
              variant="secondary"
              style={{ width: "100%", marginTop: 12 }}
              onPress={() => setIsAboutSheetOpen(false)}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
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
  sheetInputWrapper: {
    width: "100%",
    gap: 10,
    marginVertical: 12,
  },
  sheetInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  contentContainer: {
    paddingHorizontal: 16,
    gap: 20,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.6,
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
    fontSize: 16,
    fontWeight: "500",
  },
  rowSubtitle: {
    fontSize: 13,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(142, 142, 147, 0.2)",
    marginLeft: 36,
  },
  accountsContainer: {
    paddingVertical: 10,
    gap: 8,
  },
  subheading: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 36,
  },
  chipsRow: {
    flexDirection: "row",
    gap: 8,
    paddingLeft: 36,
    paddingVertical: 2,
  },
  actionRow: {
    paddingVertical: 10,
    paddingLeft: 36,
  },
  selectorRow: {
    paddingVertical: 12,
    gap: 10,
  },
  selectorHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 20,
    padding: 20,
    gap: 16,
    borderCurve: "continuous",
    boxShadow: "0px 10px 25px rgba(0, 0, 0, 0.2)",
    elevation: 8,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  modalBody: {
    gap: 12,
  },
  modalInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
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
    fontSize: 20,
    fontWeight: "700",
    marginTop: 8,
  },
  aboutVersion: {
    fontSize: 13,
    marginTop: 2,
  },
  aboutDescription: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 8,
  },
});
