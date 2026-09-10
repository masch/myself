import { useCallback } from "react";
import { router, useFocusEffect } from "expo-router";
import { View, StyleSheet, ScrollView, Text, Alert } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTasks } from "@/hooks/use-tasks";
import { type TaskItem } from "@/db/database";
import { AppButton, TaskRow } from "@/components";
import { colors } from "@/theme/colors";
import { appErrorHandler } from "@/core/errors/mobile-error-handler";

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
      refreshTasks().catch((error) => {
        appErrorHandler.handle(error, { source: "HomeScreen.useFocusEffect" });
      });
    }, [refreshTasks]),
  );

  const handleToggle = (task: TaskItem) => {
    toggleTask(task.id, !task.is_done).catch((error) => {
      appErrorHandler.handle(error, { source: "HomeScreen.handleToggle" });
    });
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
          <View style={{ flex: 1 }}>
            <Text style={[styles.greetingText, { color: colors.label }]}>
              {currentUser ? currentUser.name : "Mindful User"}
            </Text>
            <Text
              style={[styles.emailSubtext, { color: colors.secondaryLabel }]}
            >
              {currentUser ? currentUser.email : "Local-First Storage Active"}
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
            <Text style={[styles.statNumber, { color: colors.systemGreen }]}>
              {completedTasks.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.secondaryLabel }]}>
              Completed
            </Text>
          </View>
        </View>

        <AppButton
          title="New Task"
          icon="sf:plus.circle.fill"
          variant="primary"
          onPress={() => router.push("/modal")}
        />
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
                <TaskRow
                  key={task.id}
                  task={task}
                  showDivider={index > 0}
                  onToggle={() => handleToggle(task)}
                  onDelete={() => handleDelete(task)}
                />
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
                <TaskRow
                  key={task.id}
                  task={task}
                  showDivider={index > 0}
                  onToggle={() => handleToggle(task)}
                  onDelete={() => handleDelete(task)}
                />
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
            <Image
              source="sf:tray"
              style={[styles.iconGray, { tintColor: colors.secondaryLabel }]}
            />
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
    paddingHorizontal: 16,
    gap: 20,
  },
  heroCard: {
    padding: 20,
    borderRadius: 16,
    gap: 16,
    borderCurve: "continuous",
  },
  userHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  userAvatarIcon: {
    width: 44,
    height: 44,
    tintColor: "#007AFF",
  },
  greetingText: {
    fontSize: 18,
    fontWeight: "700",
  },
  emailSubtext: {
    fontSize: 13,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 28,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: "rgba(142, 142, 147, 0.3)",
  },
  tasksSection: {
    gap: 20,
  },
  groupContainer: {
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
    overflow: "hidden",
    borderCurve: "continuous",
  },
  emptyCard: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  iconGray: {
    width: 36,
    height: 36,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
  },
});
