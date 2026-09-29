import React from "react";
import {
  TextInput,
  StyleSheet,
  type TextInputProps,
  type StyleProp,
  type TextStyle,
} from "react-native";
import {
  colors,
  spacing,
  radius,
  typography,
  type TypographyVariant,
} from "@/theme";

export interface ThemedTextInputProps extends TextInputProps {
  variant?: TypographyVariant;
  style?: StyleProp<TextStyle>;
}

export function ThemedTextInput({
  variant = "body",
  placeholderTextColor = colors.secondaryLabel,
  style,
  multiline,
  ...props
}: ThemedTextInputProps) {
  const typeStyle = typography[variant] ?? typography.body;

  return (
    <TextInput
      placeholderTextColor={placeholderTextColor}
      multiline={multiline}
      style={[styles.input, typeStyle, multiline && styles.multiline, style]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    color: colors.label,
    backgroundColor: colors.systemBackground,
    borderWidth: 1,
    borderColor: colors.separator,
    borderRadius: radius.md,
    borderCurve: "continuous",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2, // 10px baseline
    minHeight: 44, // standard accessible touch/input target
  },
  multiline: {
    minHeight: 88,
    paddingTop: spacing.sm + 2,
    textAlignVertical: "top",
  },
});
