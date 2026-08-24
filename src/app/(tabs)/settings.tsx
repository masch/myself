import { useState } from "react";
import { Stack } from "expo-router";
import {
  Host,
  FieldGroup,
  ListItem,
  Switch,
  Slider,
  Picker,
  BottomSheet,
  Button,
  Column,
  Spacer,
} from "@expo/ui";
import { Image } from "expo-image";
import { View, StyleSheet, Text, Alert, TextInput } from "react-native";
import { useAuth } from "@/context/auth-context";
import { colors } from "@/theme/colors";

export default function SettingsScreen() {
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

  return (
    <View
      style={[styles.container, { backgroundColor: colors.systemBackground }]}
    >
      <Stack.Screen
        options={{
          title: "Settings",
          headerLargeTitle: true,
          headerShadowVisible: false,
        }}
      />

      <Host style={styles.host}>
        <FieldGroup>
          {/* Account Section */}
          <FieldGroup.Section title="Active Profile">
            <ListItem
              leading={
                <Image
                  source="sf:person.crop.circle.fill"
                  style={styles.iconBlue}
                />
              }
              supportingText={currentUser?.email ?? "No email"}
            >
              {currentUser?.name ?? "No user"}
            </ListItem>

            {users.length > 1 && (
              <ListItem
                leading={
                  <Image source="sf:person.2.fill" style={styles.iconGreen} />
                }
                trailing={
                  <Picker
                    selectedValue={currentUser?.id ?? 1}
                    onValueChange={(val) => switchUser(Number(val))}
                    appearance="menu"
                  >
                    {users.map((u) => (
                      <Picker.Item key={u.id} label={u.name} value={u.id} />
                    ))}
                  </Picker>
                }
              >
                Switch Account
              </ListItem>
            )}

            <ListItem
              leading={
                <Image source="sf:person.badge.plus" style={styles.iconSky} />
              }
              onPress={() => setIsNewUserSheetOpen(true)}
            >
              Add New User Account
            </ListItem>
          </FieldGroup.Section>

          {/* Preferences Section */}
          <FieldGroup.Section title="Preferences">
            <ListItem
              leading={<Image source="sf:bell.fill" style={styles.iconRed} />}
              trailing={
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                />
              }
            >
              Push Notifications
            </ListItem>

            <ListItem
              leading={<Image source="sf:faceid" style={styles.iconGreen} />}
              trailing={
                <Switch
                  value={biometricsEnabled}
                  onValueChange={setBiometricsEnabled}
                />
              }
            >
              Face ID / Biometrics
            </ListItem>

            <ListItem
              leading={<Image source="sf:globe" style={styles.iconBlue} />}
              trailing={
                <Picker
                  selectedValue={selectedLanguage}
                  onValueChange={(val) => setSelectedLanguage(val as string)}
                  appearance="menu"
                >
                  <Picker.Item label="English" value="en" />
                  <Picker.Item label="Español" value="es" />
                  <Picker.Item label="Français" value="fr" />
                  <Picker.Item label="Deutsch" value="de" />
                </Picker>
              }
            >
              Language
            </ListItem>
          </FieldGroup.Section>

          {/* Appearance Section */}
          <FieldGroup.Section title="Appearance">
            <ListItem
              leading={
                <Image source="sf:paintbrush.fill" style={styles.iconPurple} />
              }
              trailing={
                <Picker
                  selectedValue={selectedTheme}
                  onValueChange={(val) => setSelectedTheme(val as string)}
                  appearance="menu"
                >
                  <Picker.Item label="System Auto" value="system" />
                  <Picker.Item label="Light" value="light" />
                  <Picker.Item label="Dark" value="dark" />
                </Picker>
              }
            >
              Theme
            </ListItem>

            <ListItem
              leading={
                <Image
                  source="sf:speaker.wave.2.fill"
                  style={styles.iconOrange}
                />
              }
              supportingText={`Sound volume: ${Math.round(volume * 100)}%`}
            >
              <Slider
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
                <Image source="sf:hand.raised.fill" style={styles.iconOrange} />
              }
              trailing={
                <Switch
                  value={analyticsEnabled}
                  onValueChange={setAnalyticsEnabled}
                />
              }
            >
              Share Analytics
            </ListItem>

            <ListItem
              leading={
                <Image source="sf:info.circle.fill" style={styles.iconGray} />
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
          <Column style={styles.sheetContent}>
            <Image source="sf:person.badge.plus" style={styles.sheetIcon} />
            <Spacer />
            <Text style={[styles.sheetTitle, { color: colors.label }]}>
              Create User
            </Text>

            <View style={styles.sheetInputWrapper}>
              <TextInput
                placeholder="Full Name (e.g. Maria Perez)"
                placeholderTextColor="#8E8E93"
                value={newUserName}
                onChangeText={setNewUserName}
                style={[styles.sheetInput, { color: colors.label }]}
              />
              <TextInput
                placeholder="Email (e.g. maria@example.com)"
                placeholderTextColor="#8E8E93"
                value={newUserEmail}
                onChangeText={setNewUserEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                style={[styles.sheetInput, { color: colors.label }]}
              />
            </View>

            <Spacer />
            <Button onPress={handleCreateUser}>Create & Switch</Button>
          </Column>
        </BottomSheet>

        {/* Native BottomSheet for About Modal */}
        <BottomSheet
          isPresented={isAboutSheetOpen}
          onDismiss={() => setIsAboutSheetOpen(false)}
          snapPoints={["half"]}
        >
          <Column style={styles.sheetContent}>
            <Image
              source="sf:app.badge.checkmark.fill"
              style={styles.sheetIcon}
            />
            <Spacer />
            <Text style={[styles.sheetTitle, { color: colors.label }]}>
              Myself App
            </Text>
            <Text
              style={[styles.sheetSubtitle, { color: colors.secondaryLabel }]}
            >
              Version 1.0.0 (Expo SDK 57)
            </Text>
            <Text
              style={[
                styles.sheetDescription,
                { color: colors.secondaryLabel },
              ]}
            >
              Multi-user SQLite database with scoped tasks and native @expo/ui
              controls.
            </Text>
            <Spacer />
            <Button onPress={() => setIsAboutSheetOpen(false)}>Done</Button>
          </Column>
        </BottomSheet>
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  host: {
    flex: 1,
  },
  iconBlue: {
    width: 28,
    height: 28,
    tintColor: "#007AFF",
  },
  iconSky: {
    width: 28,
    height: 28,
    tintColor: "#34AADC",
  },
  iconGreen: {
    width: 28,
    height: 28,
    tintColor: "#34C759",
  },
  iconRed: {
    width: 28,
    height: 28,
    tintColor: "#FF3B30",
  },
  iconOrange: {
    width: 28,
    height: 28,
    tintColor: "#FF9500",
  },
  iconPurple: {
    width: 28,
    height: 28,
    tintColor: "#AF52DE",
  },
  iconGray: {
    width: 28,
    height: 28,
    tintColor: "#8E8E93",
  },
  sheetContent: {
    padding: 24,
    alignItems: "center",
  },
  sheetIcon: {
    width: 52,
    height: 52,
    tintColor: "#007AFF",
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  sheetSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  sheetDescription: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 12,
    lineHeight: 20,
  },
  sheetInputWrapper: {
    width: "100%",
    gap: 10,
    marginTop: 14,
  },
  sheetInput: {
    borderWidth: 1,
    borderColor: "#38383A",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
});
