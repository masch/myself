import React from "react";
import {
  View,
  StyleSheet,
  type ViewProps,
  type ColorValue,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { colors, spacing, type SpacingKey } from "@/theme";

export interface DividerProps extends ViewProps {
  orientation?: "horizontal" | "vertical";
  inset?: SpacingKey;
  color?: ColorValue;
  style?: StyleProp<ViewStyle>;
}

export function Divider({
  orientation = "horizontal",
  inset,
  color = colors.separator,
  style,
  ...props
}: DividerProps) {
  const isHorizontal = orientation === "horizontal";
  const insetMargin = inset ? spacing[inset] : 0;

  return (
    <View
      accessibilityRole="none"
      style={[
        isHorizontal ? styles.horizontal : styles.vertical,
        {
          backgroundColor: color,
          marginHorizontal: isHorizontal ? insetMargin : undefined,
          marginVertical: !isHorizontal ? insetMargin : undefined,
        },
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  horizontal: {
    height: StyleSheet.hairlineWidth,
    width: "100%",
  },
  vertical: {
    width: StyleSheet.hairlineWidth,
    height: "100%",
  },
});
