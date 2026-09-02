import { useState } from "react";
import { router, Stack } from "expo-router";
import {
  View,
  StyleSheet,
  TextInput,
  Text,
  Alert,
  ScrollView,
} from "react-native";
import { Image } from "expo-image";
import { useTasks } from "@/hooks/use-tasks";
import { HeaderButton, ChipButton } from "@/components";
import { colors } from "@/theme/colors";

const CATEGORIES = ["Work", "Personal", "Shopping", "Design", "Urgent"];

export default function ModalScreen() {
  const { addTask } = useTasks();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Work");

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Title required", "Please enter a title for the task.");
      return;
    }

    try {
      await addTask({
        title: title.trim(),
        category,
        description: description.trim(),
      });
      router.back();
    } catch (error) {
      console.error("Failed to add task:", error);
      Alert.alert("Error", "Could not save task.");
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.systemBackground }]}
      contentContainerStyle={styles.contentContainer}
      contentInsetAdjustmentBehavior="automatic"
    >
      <Stack.Screen
        options={{
          title: "New Task",
          presentation: "modal",
          headerLeft: () => (
            <HeaderButton
              title="Cancel"
              variant="cancel"
              onPress={() => router.back()}
            />
          ),
          headerRight: () => (
            <HeaderButton title="Save" variant="primary" onPress={handleSave} />
          ),
        }}
      />

      {/* Category selector chips */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.secondaryLabel }]}>
          CATEGORY
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesRow}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = category === cat;
            return (
              <ChipButton
                key={cat}
                title={cat}
                variant={isSelected ? "blue" : "secondary"}
                onPress={() => setCategory(cat)}
              />
            );
          })}
        </ScrollView>
      </View>

      {/* Task input card */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.secondaryLabel }]}>
          TASK DETAILS
        </Text>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.secondarySystemBackground },
          ]}
        >
          <View style={styles.inputRow}>
            <Image
              source="sf:text.badge.plus"
              style={[styles.inputIcon, { tintColor: colors.systemBlue }]}
            />
            <TextInput
              placeholder="Task title"
              placeholderTextColor={colors.secondaryLabel}
              value={title}
              onChangeText={setTitle}
              style={[styles.input, { color: colors.label }]}
              autoFocus
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.inputRow}>
            <Image
              source="sf:note.text"
              style={[styles.inputIcon, { tintColor: colors.systemPurple }]}
            />
            <TextInput
              placeholder="Description or notes (optional)"
              placeholderTextColor={colors.secondaryLabel}
              value={description}
              onChangeText={setDescription}
              style={[styles.input, styles.descInput, { color: colors.label }]}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
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
  categoriesRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 2,
  },
  card: {
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 16,
    borderCurve: "continuous",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  },
  inputIcon: {
    width: 22,
    height: 22,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
  },
  descInput: {
    minHeight: 60,
    textAlignVertical: "top",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(142, 142, 147, 0.2)",
    marginLeft: 34,
  },
});
