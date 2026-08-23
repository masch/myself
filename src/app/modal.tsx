import { router, Stack } from "expo-router";
import { View, StyleSheet, Text, Pressable } from "react-native";
import { Image } from "expo-image";
import { Host, FieldGroup, ListItem, Switch } from "@expo/ui";
import { useState } from "react";
import { colors } from "@/theme/colors";

export default function ModalScreen() {
  const [isUrgent, setIsUrgent] = useState(false);

  return (
    <View style={[styles.container, { backgroundColor: colors.systemBackground }]}>
      <Stack.Screen
        options={{
          title: "Quick Action",
          presentation: "modal",
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={styles.headerButton}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          ),
          headerRight: () => (
            <Pressable onPress={() => router.back()} style={styles.headerButton}>
              <Text style={styles.doneText}>Save</Text>
            </Pressable>
          ),
        }}
      />

      <Host style={styles.host}>
        <FieldGroup>
          <FieldGroup.Section title="Create Task">
            <ListItem
              leading={<Image source="sf:star.fill" style={styles.iconYellow} />}
              trailing={<Switch value={isUrgent} onValueChange={setIsUrgent} />}
            >
              Mark as Urgent
            </ListItem>
            <ListItem
              leading={<Image source="sf:calendar" style={styles.iconBlue} />}
              trailing={<Text style={[styles.subText, { color: colors.secondaryLabel }]}>Today</Text>}
            >
              Due Date
            </ListItem>
          </FieldGroup.Section>
        </FieldGroup>
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 12,
  },
  host: {
    flex: 1,
  },
  headerButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cancelText: {
    color: "#FF3B30",
    fontSize: 16,
  },
  doneText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
  },
  iconYellow: {
    width: 26,
    height: 26,
    tintColor: "#FFCC00",
  },
  iconBlue: {
    width: 26,
    height: 26,
    tintColor: "#007AFF",
  },
  subText: {
    fontSize: 14,
  },
});
