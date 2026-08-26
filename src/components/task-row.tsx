import React from "react";
import {
  Pressable,
  View,
  Text,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Image } from "expo-image";
import { type TaskItem } from "@/db/database";
import { IconButton } from "./icon-button";
import { colors } from "@/theme/colors";

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
      {showDivider && <View style={styles.divider} />}
      <Pressable
        style={({ pressed }) => [
          styles.row,
          { opacity: pressed ? 0.7 : 1 },
          style,
        ]}
        onPress={onToggle}
      >
        <Image
          source={isDone ? "sf:checkmark.circle.fill" : "sf:circle"}
          style={[
            styles.checkIcon,
            {
              tintColor: (isDone
                ? colors.systemGreen
                : colors.systemBlue) as any,
            },
          ]}
        />

        <View style={styles.content}>
          <Text
            style={[
              styles.title,
              {
                color: (isDone ? colors.secondaryLabel : colors.label) as any,
                textDecorationLine: isDone ? "line-through" : "none",
              },
            ]}
          >
            {task.title}
          </Text>

          <Text
            style={[styles.subtitle, { color: colors.secondaryLabel as any }]}
          >
            {task.category}
            {task.description ? ` • ${task.description}` : ""}
          </Text>
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(142, 142, 147, 0.2)",
    marginLeft: 48,
  },
  checkIcon: {
    width: 22,
    height: 22,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: "500",
  },
  subtitle: {
    fontSize: 13,
  },
});
