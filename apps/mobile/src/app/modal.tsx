import { useState } from "react";
import { router, Stack } from "expo-router";
import { View, StyleSheet, Alert, ScrollView } from "react-native";
import { Image } from "expo-image";
import { useTasks } from "@/hooks/use-tasks";
import {
  HeaderButton,
  ChipButton,
  ThemedText,
  Card,
  FormRow,
  Divider,
} from "@/components";
import { colors } from "@/theme";

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
        <ThemedText
          variant="caption1"
          color={colors.secondaryLabel}
          style={styles.sectionTitle}
        >
          CATEGORY
        </ThemedText>
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
        <ThemedText
          variant="caption1"
          color={colors.secondaryLabel}
          style={styles.sectionTitle}
        >
          TASK DETAILS
        </ThemedText>
        <Card variant="subdued" padding="none" style={styles.card}>
          <FormRow>
            <FormRow.Leading>
              <Image
                source="sf:text.badge.plus"
                style={[styles.inputIcon, { tintColor: colors.systemBlue }]}
              />
            </FormRow.Leading>
            <FormRow.Input
              placeholder="Task title"
              value={title}
              onChangeText={setTitle}
              autoFocus
            />
          </FormRow>

          <Divider style={styles.divider} />

          <FormRow>
            <FormRow.Leading>
              <Image
                source="sf:note.text"
                style={[styles.inputIcon, { tintColor: colors.systemPurple }]}
              />
            </FormRow.Leading>
            <FormRow.Input
              placeholder="Description or notes (optional)"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              style={styles.descInput}
            />
          </FormRow>
        </Card>
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
  inputIcon: {
    width: 22,
    height: 22,
  },
  descInput: {
    minHeight: 60,
  },
  divider: {
    marginLeft: 34,
  },
});
