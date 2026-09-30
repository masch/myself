import React from "react";
import {
  Pressable,
  View,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { type TaskItem } from "@/infrastructure/persistence/database";
import { IconButton } from "./icon-button";
import { ThemedText } from "./themed-text";
import { Divider } from "./divider";
import { AppIcon } from "./app-icon";
import { colors, spacing } from "@/theme";

export interface TaskRowProps {
  task: TaskItem;
  onToggle: () => void;
  onDelete: () => void;
  showDivider?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function TaskRow({
  task,
  onToggle,
  onDelete,
  showDivider = false,
  style,
}: TaskRowProps) {
  const isDone = Boolean(task.is_done);

  return (
    <View>
      {showDivider && <Divider style={styles.divider} />}
      <Pressable
        style={({ pressed }) => [
          styles.row,
          { opacity: pressed ? 0.7 : 1 },
          style,
        ]}
        onPress={onToggle}
      >
        <AppIcon
          name={isDone ? "sf:checkmark.circle.fill" : "sf:circle"}
          size={22}
          color={isDone ? colors.systemGreen : colors.systemBlue}
        />

        <View style={styles.content}>
          <ThemedText
            variant="body"
            color={isDone ? colors.secondaryLabel : colors.label}
            style={isDone ? styles.strikethrough : undefined}
          >
            {task.title}
          </ThemedText>

          <ThemedText variant="caption1" color={colors.secondaryLabel}>
            {task.category}
            {task.description ? ` • ${task.description}` : ""}
          </ThemedText>
        </View>

        <IconButton
          icon="sf:trash"
          color={colors.systemRed}
          size="medium"
          onPress={onDelete}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md - 4,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  divider: {
    marginLeft: 48,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  strikethrough: {
    textDecorationLine: "line-through",
  },
});
