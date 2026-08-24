import { useState } from "react";
import { router, Stack } from "expo-router";
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  TextInput,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import { Host, FieldGroup, ListItem, Picker } from "@expo/ui";
import { useTasks } from "@/hooks/use-tasks";
import { colors } from "@/theme/colors";

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
    <View
      style={[styles.container, { backgroundColor: colors.systemBackground }]}
    >
      <Stack.Screen
        options={{
          title: "New Task",
          presentation: "modal",
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              style={styles.headerButton}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          ),
          headerRight: () => (
            <Pressable onPress={handleSave} style={styles.headerButton}>
              <Text style={styles.doneText}>Save</Text>
            </Pressable>
          ),
        }}
      />

      <Host style={styles.host}>
        <FieldGroup>
          <FieldGroup.Section title="Task Details">
            <View style={styles.inputRow}>
              <TextInput
                placeholder="Task title"
                placeholderTextColor="#8E8E93"
                value={title}
                onChangeText={setTitle}
                style={[styles.input, { color: colors.label }]}
                autoFocus
              />
            </View>

            <View style={styles.inputRow}>
              <TextInput
                placeholder="Description (optional)"
                placeholderTextColor="#8E8E93"
                value={description}
                onChangeText={setDescription}
                style={[
                  styles.input,
                  styles.descInput,
                  { color: colors.label },
                ]}
                multiline
              />
            </View>

            <ListItem
              leading={<Image source="sf:tag.fill" style={styles.iconBlue} />}
              trailing={
                <Picker
                  selectedValue={category}
                  onValueChange={(val) => setCategory(val as string)}
                  appearance="menu"
                >
                  <Picker.Item label="Work" value="Work" />
                  <Picker.Item label="Personal" value="Personal" />
                  <Picker.Item label="Shopping" value="Shopping" />
                  <Picker.Item label="Urgent" value="Urgent" />
                </Picker>
              }
            >
              Category
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
  inputRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  input: {
    fontSize: 16,
    paddingVertical: 8,
  },
  descInput: {
    minHeight: 48,
    textAlignVertical: "top",
  },
  iconBlue: {
    width: 24,
    height: 24,
    tintColor: "#007AFF",
  },
});
