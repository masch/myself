import React from "react";
import {
  Pressable,
  Text,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
  type PressableProps,
  type ColorValue,
} from "react-native";
import { colors } from "@/theme/colors";

export type HeaderButtonVariant = "primary" | "cancel" | "destructive";

export interface HeaderButtonProps extends Omit<PressableProps, "style"> {
  title: string;
  variant?: HeaderButtonVariant;
  color?: ColorValue;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function HeaderButton({
  title,
  variant = "primary",
  color,
  style,
  textStyle,
  disabled,
  ...props
}: HeaderButtonProps) {
  const getDefaultColor = (): ColorValue => {
    switch (variant) {
      case "cancel":
      case "destructive":
        return colors.systemRed;
      case "primary":
      default:
        return colors.systemBlue;
    }
  };

  const finalColor = color || getDefaultColor();
  const isPrimary = variant === "primary";

  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={8}
      style={({ pressed }) => [
        styles.base,
        { opacity: disabled ? 0.4 : pressed ? 0.6 : 1 },
        style,
      ]}
      disabled={disabled}
      {...props}
    >
      <Text
        style={[
          styles.text,
          {
            color: finalColor as any,
            fontWeight: isPrimary ? "600" : "400",
          },
          textStyle,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    fontSize: 16,
  },
});
