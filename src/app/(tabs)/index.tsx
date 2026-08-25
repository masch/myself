import { useCallback } from "react";
import { Link, useFocusEffect } from "expo-router";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Text,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTasks } from "@/hooks/use-tasks";
import { type TaskItem } from "@/db/database";
import { colors } from "@/theme/colors";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
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
      contentContainerStyle={[
        styles.contentContainer,
        {
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 16,
        },
      ]}
      contentInsetAdjustmentBehavior="automatic"
    >
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

      {/* Tasks Section */}
      <View style={styles.tasksSection}>
        {pendingTasks.length > 0 && (
          <View style={styles.groupContainer}>
            <Text
              style={[styles.sectionTitle, { color: colors.secondaryLabel }]}
            >
              TO DO
            </Text>
            <View
              style={[
                styles.card,
                { backgroundColor: colors.secondarySystemBackground },
              ]}
            >
              {pendingTasks.map((task, index) => (
                <View key={task.id}>
                  {index > 0 && <View style={styles.divider} />}
                  <Pressable
                    style={styles.taskRow}
                    onPress={() => handleToggle(task)}
                  >
                    <Image source="sf:circle" style={styles.iconBlue} />
                    <View style={styles.taskContent}>
                      <Text style={[styles.taskTitle, { color: colors.label }]}>
                        {task.title}
                      </Text>
                      <Text
                        style={[
                          styles.taskSubtitle,
                          { color: colors.secondaryLabel },
                        ]}
                      >
                        {task.category}
                        {task.description ? ` • ${task.description}` : ""}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => handleDelete(task)}
                      hitSlop={12}
                      style={styles.deleteButton}
                    >
                      <Image source="sf:trash" style={styles.iconTrash} />
                    </Pressable>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        )}

        {completedTasks.length > 0 && (
          <View style={styles.groupContainer}>
            <Text
              style={[styles.sectionTitle, { color: colors.secondaryLabel }]}
            >
              COMPLETED
            </Text>
            <View
              style={[
                styles.card,
                { backgroundColor: colors.secondarySystemBackground },
              ]}
            >
              {completedTasks.map((task, index) => (
                <View key={task.id}>
                  {index > 0 && <View style={styles.divider} />}
                  <Pressable
                    style={styles.taskRow}
                    onPress={() => handleToggle(task)}
                  >
                    <Image
                      source="sf:checkmark.circle.fill"
                      style={styles.iconGreen}
                    />
                    <View style={styles.taskContent}>
                      <Text
                        style={[
                          styles.taskTitle,
                          styles.completedTitle,
                          { color: colors.secondaryLabel },
                        ]}
                      >
                        {task.title}
                      </Text>
                      <Text
                        style={[
                          styles.taskSubtitle,
                          { color: colors.secondaryLabel },
                        ]}
                      >
                        {task.category}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => handleDelete(task)}
                      hitSlop={12}
                      style={styles.deleteButton}
                    >
                      <Image source="sf:trash" style={styles.iconTrash} />
                    </Pressable>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        )}

        {tasks.length === 0 && !isLoading && (
          <View
            style={[
              styles.card,
              styles.emptyCard,
              { backgroundColor: colors.secondarySystemBackground },
            ]}
          >
            <Image source="sf:tray" style={styles.iconGray} />
            <Text style={[styles.emptyText, { color: colors.secondaryLabel }]}>
              No tasks found. Tap &apos;New Task&apos; to create one.
            </Text>
          </View>
        )}
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
  tasksSection: {
    gap: 16,
  },
  groupContainer: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.6,
    marginLeft: 4,
  },
  card: {
    borderRadius: 16,
    overflow: "hidden",
    borderCurve: "continuous",
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  taskContent: {
    flex: 1,
    gap: 2,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: "500",
  },
  completedTitle: {
    textDecorationLine: "line-through",
    opacity: 0.8,
  },
  taskSubtitle: {
    fontSize: 13,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(142, 142, 147, 0.2)",
    marginLeft: 50,
  },
  deleteButton: {
    padding: 4,
  },
  emptyCard: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
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
    width: 28,
    height: 28,
    tintColor: "#8E8E93",
  },
  iconTrash: {
    width: 20,
    height: 20,
    tintColor: "#FF3B30",
  },
});
