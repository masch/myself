import { useCallback } from "react";
import { router, useFocusEffect } from "expo-router";
import { View, StyleSheet, Alert } from "react-native";
import { useTasks } from "@/hooks/use-tasks";
import { type TaskItem } from "@/infrastructure/persistence/database";
import {
  AppButton,
  AppIcon,
  TaskRow,
  ScreenContainer,
  Card,
  ThemedText,
  EmptyState,
} from "@/components";
import { colors, spacing } from "@/theme";
import { appErrorHandler } from "@/infrastructure/errors/mobile-error-handler";

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
    <ScreenContainer.Scroll>
      {/* Summary Card */}
      <Card variant="subdued" padding="lg" style={styles.heroCard}>
        <View style={styles.userHeaderRow}>
          <AppIcon
            name="sf:person.crop.circle.fill"
            size={44}
            color={colors.systemBlue}
          />
          <View style={{ flex: 1 }}>
            <ThemedText variant="title2">
              {currentUser ? currentUser.name : "Mindful User"}
            </ThemedText>
            <ThemedText variant="caption1" color={colors.secondaryLabel}>
              {currentUser ? currentUser.email : "Local-First Storage Active"}
            </ThemedText>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <ThemedText
              variant="title1"
              color={colors.systemBlue}
              style={styles.statNumber}
            >
              {pendingTasks.length}
            </ThemedText>
            <ThemedText variant="caption2" color={colors.secondaryLabel}>
              Pending
            </ThemedText>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <ThemedText
              variant="title1"
              color={colors.systemGreen}
              style={styles.statNumber}
            >
              {completedTasks.length}
            </ThemedText>
            <ThemedText variant="caption2" color={colors.secondaryLabel}>
              Completed
            </ThemedText>
          </View>
        </View>

        <AppButton
          title="New Task"
          icon="sf:plus.circle.fill"
          variant="primary"
          onPress={() => router.push("/modal")}
        />
      </Card>

      {/* Tasks Section */}
      <View style={styles.tasksSection}>
        {pendingTasks.length > 0 && (
          <View style={styles.groupContainer}>
            <ThemedText
              variant="caption1"
              color={colors.secondaryLabel}
              style={styles.sectionTitle}
            >
              TO DO
            </ThemedText>
            <Card variant="subdued" padding="none">
              {pendingTasks.map((task, index) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  showDivider={index > 0}
                  onToggle={() => handleToggle(task)}
                  onDelete={() => handleDelete(task)}
                />
              ))}
            </Card>
          </View>
        )}

        {completedTasks.length > 0 && (
          <View style={styles.groupContainer}>
            <ThemedText
              variant="caption1"
              color={colors.secondaryLabel}
              style={styles.sectionTitle}
            >
              COMPLETED
            </ThemedText>
            <Card variant="subdued" padding="none">
              {completedTasks.map((task, index) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  showDivider={index > 0}
                  onToggle={() => handleToggle(task)}
                  onDelete={() => handleDelete(task)}
                />
              ))}
            </Card>
          </View>
        )}

        {tasks.length === 0 && !isLoading && (
          <EmptyState.Card
            icon="sf:tray"
            description="No tasks found. Tap 'New Task' to create one."
          />
        )}
      </View>
    </ScreenContainer.Scroll>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    gap: spacing.md,
  },
  userHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 4,
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
    fontWeight: "700",
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: "rgba(142, 142, 147, 0.3)",
  },
  tasksSection: {
    gap: spacing.lg - 4,
  },
  groupContainer: {
    gap: spacing.sm,
  },
  sectionTitle: {
    letterSpacing: 0.6,
    paddingHorizontal: spacing.xs,
  },
});
