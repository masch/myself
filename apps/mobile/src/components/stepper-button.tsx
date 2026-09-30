import React from "react";
import {
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
  type PressableProps,
} from "react-native";
import { colors, radius, spacing } from "@/theme";
import { ThemedText } from "./themed-text";

export interface StepperButtonProps extends Omit<
  PressableProps,
  "style" | "accessibilityLabel"
> {
  direction: "up" | "down";
  onPress: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function StepperButton({
  direction,
  onPress,
  style,
  disabled,
  accessibilityLabel,
  ...props
}: StepperButtonProps) {
  const defaultLabel =
    direction === "up" ? "Incrementar valor" : "Decrementar valor";
  const finalLabel = accessibilityLabel || defaultLabel;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={finalLabel}
      aria-label={finalLabel}
      hitSlop={spacing.xs + 2}
      style={({ pressed }) => [
        styles.base,
        {
          borderColor: colors.secondaryLabel as any,
          opacity: disabled ? 0.35 : pressed ? 0.6 : 1,
          transform: [{ scale: pressed ? 0.94 : 1 }],
        },
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      {...props}
    >
      <ThemedText variant="caption1" color={colors.label} style={styles.arrow}>
        {direction === "up" ? "▲" : "▼"}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: 36,
    height: 28,
    borderRadius: radius.sm - 2, // 6px
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  arrow: {
    fontWeight: "600",
  },
});
