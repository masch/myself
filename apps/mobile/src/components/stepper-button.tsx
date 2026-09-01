import React from "react";
import {
  Pressable,
  Text,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
  type PressableProps,
} from "react-native";
import { colors } from "@/theme/colors";

export interface StepperButtonProps extends Omit<PressableProps, "style"> {
  direction: "up" | "down";
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

export function StepperButton({
  direction,
  onPress,
  style,
  disabled,
  ...props
}: StepperButtonProps) {
  return (
    <Pressable
      hitSlop={6}
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
      <Text style={[styles.arrow, { color: colors.label as any }]}>
        {direction === "up" ? "▲" : "▼"}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: 36,
    height: 28,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  arrow: {
    fontSize: 14,
    fontWeight: "600",
  },
});
