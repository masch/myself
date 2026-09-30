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
import { colors, layout, spacing } from "@/theme";

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
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isDone }}
        aria-checked={isDone}
        accessibilityLabel={`${task.title}, ${task.category}${task.description ? `, ${task.description}` : ""}`}
        style={({ pressed }) => [
          styles.row,
          { opacity: pressed ? 0.7 : 1 },
          style,
        ]}
        onPress={onToggle}
      >
        <AppIcon
          name={isDone ? "sf:checkmark.circle.fill" : "sf:circle"}
          size={layout.iconSize.row}
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
          accessibilityLabel={`Eliminar tarea ${task.title}`}
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
    paddingVertical: spacing.compact,
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
