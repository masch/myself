import { useCallback } from "react";
import { Link, Stack, useFocusEffect } from "expo-router";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Text,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import { Host, FieldGroup, ListItem } from "@expo/ui";
import { useTasks } from "@/hooks/use-tasks";
import { type TaskItem } from "@/db/database";
import { colors } from "@/theme/colors";

export default function HomeScreen() {
  const {
    currentUser,
    tasks,
    isLoading,
    refreshTasks,
    toggleTask,
    deleteTask,
  } = useTasks();

  useFocusEffect(
    useCallback(() => {
      refreshTasks();
    }, [refreshTasks]),
  );

  const handleToggle = (task: TaskItem) => {
    toggleTask(task.id, !task.is_done);
  };

  const handleDelete = (task: TaskItem) => {
    Alert.alert(
      "Delete Task",
      `Are you sure you want to delete "${task.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteTask(task.id),
        },
      ],
    );
  };

  const pendingTasks = tasks.filter((t) => !t.is_done);
  const completedTasks = tasks.filter((t) => !!t.is_done);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.systemBackground }]}
      contentContainerStyle={styles.contentContainer}
      contentInsetAdjustmentBehavior="automatic"
    >
      <Stack.Screen
        options={{
          title: "Tasks",
          headerLargeTitle: true,
          headerShadowVisible: false,
          headerRight: () => (
            <Link href="/modal" asChild>
              <Pressable style={styles.headerAddButton}>
                <Image source="sf:plus" style={styles.headerAddIcon} />
              </Pressable>
            </Link>
          ),
        }}
      />

      {/* Summary Card */}
      <View
        style={[
          styles.heroCard,
          { backgroundColor: colors.secondarySystemBackground },
        ]}
      >
        <View style={styles.userHeaderRow}>
          <Image
            source="sf:person.crop.circle.fill"
            style={styles.userAvatarIcon}
          />
          <View>
            <Text style={[styles.userNameText, { color: colors.label }]}>
              {currentUser?.name ?? "Alex Developer"}
            </Text>
            <Text
              style={[styles.userEmailText, { color: colors.secondaryLabel }]}
            >
              {currentUser?.email ?? "alex.developer@example.com"}
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.systemBlue }]}>
              {pendingTasks.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.secondaryLabel }]}>
              Pending
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: "#34C759" }]}>
              {completedTasks.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.secondaryLabel }]}>
              Completed
            </Text>
          </View>
        </View>

        <Link href="/modal" asChild>
          <Pressable style={styles.modalButton}>
            <Image source="sf:plus.circle.fill" style={styles.buttonIcon} />
            <Text style={styles.modalButtonText}>New Task</Text>
          </Pressable>
        </Link>
      </View>

      {/* Tasks List */}
      <Host style={styles.host}>
        <FieldGroup>
          {pendingTasks.length > 0 && (
            <FieldGroup.Section title="To Do">
              {pendingTasks.map((task) => (
                <ListItem
                  key={task.id}
                  leading={<Image source="sf:circle" style={styles.iconBlue} />}
                  supportingText={
                    task.category +
                    (task.description ? ` • ${task.description}` : "")
                  }
                  trailing={
                    <Pressable onPress={() => handleDelete(task)} hitSlop={8}>
                      <Image source="sf:trash" style={styles.iconTrash} />
                    </Pressable>
                  }
                  onPress={() => handleToggle(task)}
                >
                  {task.title}
                </ListItem>
              ))}
            </FieldGroup.Section>
          )}

          {completedTasks.length > 0 && (
            <FieldGroup.Section title="Completed">
              {completedTasks.map((task) => (
                <ListItem
                  key={task.id}
                  leading={
                    <Image
                      source="sf:checkmark.circle.fill"
                      style={styles.iconGreen}
                    />
                  }
                  supportingText={task.category}
                  trailing={
                    <Pressable onPress={() => handleDelete(task)} hitSlop={8}>
                      <Image source="sf:trash" style={styles.iconTrash} />
                    </Pressable>
                  }
                  onPress={() => handleToggle(task)}
                >
                  {task.title}
                </ListItem>
              ))}
            </FieldGroup.Section>
          )}

          {tasks.length === 0 && !isLoading && (
            <FieldGroup.Section title="Tasks">
              <ListItem
                leading={<Image source="sf:tray" style={styles.iconGray} />}
                trailing={
                  <Text style={{ color: colors.secondaryLabel }}>Empty</Text>
                }
              >
                No tasks found for this user. Tap &apos;New Task&apos; to create
                one.
              </ListItem>
            </FieldGroup.Section>
          )}
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
  headerAddButton: {
    padding: 6,
  },
  headerAddIcon: {
    width: 22,
    height: 22,
    tintColor: "#007AFF",
  },
  heroCard: {
    padding: 20,
    borderRadius: 16,
    gap: 14,
    borderCurve: "continuous",
  },
  userHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: 4,
  },
  userAvatarIcon: {
    width: 38,
    height: 38,
    tintColor: "#007AFF",
  },
  userNameText: {
    fontSize: 17,
    fontWeight: "700",
  },
  userEmailText: {
    fontSize: 13,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingTop: 4,
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 26,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 13,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: "#38383A",
  },
  modalButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    borderCurve: "continuous",
  },
  buttonIcon: {
    width: 18,
    height: 18,
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
    width: 24,
    height: 24,
    tintColor: "#007AFF",
  },
  iconGreen: {
    width: 24,
    height: 24,
    tintColor: "#34C759",
  },
  iconGray: {
    width: 24,
    height: 24,
    tintColor: "#8E8E93",
  },
  iconTrash: {
    width: 20,
    height: 20,
    tintColor: "#FF3B30",
  },
});
