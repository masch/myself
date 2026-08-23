import { Link, Stack } from "expo-router";
import { View, StyleSheet, ScrollView, Pressable, Text } from "react-native";
import { Image } from "expo-image";
import { Host, FieldGroup, ListItem } from "@expo/ui";

export default function HomeScreen() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      contentInsetAdjustmentBehavior="automatic"
    >
      <Stack.Screen
        options={{
          title: "Home",
          headerLargeTitle: true,
          headerShadowVisible: false,
        }}
      />

      <View style={styles.heroCard}>
        <Image source="sf:sparkles" style={styles.heroIcon} />
        <Text style={styles.heroTitle}>Welcome to Myself</Text>
        <Text style={styles.heroSubtitle}>
          Expo SDK 57 app with Native Tabs, native modals, and @expo/ui controls.
        </Text>

        <Link href="/modal" asChild>
          <Pressable style={styles.modalButton}>
            <Image source="sf:plus.circle.fill" style={styles.buttonIcon} />
            <Text style={styles.modalButtonText}>Open Native Modal</Text>
          </Pressable>
        </Link>
      </View>

      <Host style={styles.host}>
        <FieldGroup>
          <FieldGroup.Section title="Quick Overview">
            <ListItem
              leading={<Image source="sf:chart.bar.fill" style={styles.iconBlue} />}
              trailing={<Text style={styles.valueText}>Active</Text>}
            >
              System Status
            </ListItem>
            <ListItem
              leading={<Image source="sf:cube.transparent.fill" style={styles.iconGreen} />}
              trailing={<Text style={styles.valueText}>SDK 57</Text>}
            >
              Expo Version
            </ListItem>
            <ListItem
              leading={<Image source="sf:gearshape.fill" style={styles.iconPurple} />}
              trailing={<Text style={styles.valueText}>Native</Text>}
            >
              UI Engine
            </ListItem>
          </FieldGroup.Section>
        </FieldGroup>
      </Host>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 16,
  },
  heroCard: {
    backgroundColor: "#F2F2F7",
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    gap: 10,
    borderCurve: "continuous",
  },
  heroIcon: {
    width: 44,
    height: 44,
    tintColor: "#007AFF",
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#000",
  },
  heroSubtitle: {
    fontSize: 14,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 20,
  },
  modalButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007AFF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
    borderCurve: "continuous",
  },
  buttonIcon: {
    width: 20,
    height: 20,
    tintColor: "#FFF",
  },
  modalButtonText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 15,
  },
  host: {
    flex: 1,
  },
  iconBlue: {
    width: 26,
    height: 26,
    tintColor: "#007AFF",
  },
  iconGreen: {
    width: 26,
    height: 26,
    tintColor: "#34C759",
  },
  iconPurple: {
    width: 26,
    height: 26,
    tintColor: "#AF52DE",
  },
  valueText: {
    fontSize: 14,
    color: "#8E8E93",
  },
});
