import React from "react";
import {
  Text,
  type TextProps,
  type TextStyle,
  type StyleProp,
  type ColorValue,
} from "react-native";
import { colors, typography, type TypographyVariant } from "@/theme";

export interface ThemedTextProps extends TextProps {
  variant?: TypographyVariant;
  color?: ColorValue;
  style?: StyleProp<TextStyle>;
  children?: React.ReactNode;
}

export function ThemedText({
  variant = "body",
  color,
  style,
  children,
  ...props
}: ThemedTextProps) {
  const tokenStyle = typography[variant];
  const defaultColor =
    variant === "caption1" || variant === "caption2"
      ? colors.secondaryLabel
      : colors.label;

  return (
    <Text
      style={[tokenStyle, { color: color ?? defaultColor }, style]}
      {...props}
    >
      {children}
    </Text>
  );
}
