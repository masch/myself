import React, { forwardRef, useImperativeHandle, useRef } from "react";
import {
  TextInput,
  StyleSheet,
  type TextInputProps,
  type StyleProp,
  type TextStyle,
  type NativeSyntheticEvent,
  type TargetedEvent,
} from "react-native";
import {
  colors,
  spacing,
  radius,
  typography,
  type TypographyVariant,
} from "@/theme";
import { useScrollContainer } from "./screen-container";

export interface ThemedTextInputProps extends TextInputProps {
  variant?: TypographyVariant;
  style?: StyleProp<TextStyle>;
}

export const ThemedTextInput = forwardRef<TextInput, ThemedTextInputProps>(
  function ThemedTextInput(
    {
      variant = "body",
      placeholderTextColor = colors.secondaryLabel,
      style,
      multiline,
      onFocus,
      ...props
    },
    ref,
  ) {
    const typeStyle = typography[variant] ?? typography.body;
    const internalRef = useRef<TextInput>(null);
    const scrollContainer = useScrollContainer();

    useImperativeHandle(ref, () => internalRef.current as TextInput);

    const handleFocus = (e: NativeSyntheticEvent<TargetedEvent>) => {
      onFocus?.(e as any);
      if (scrollContainer && internalRef.current) {
        scrollContainer.scrollToFocusedInput(internalRef.current);
      }
    };

    return (
      <TextInput
        ref={internalRef}
        placeholderTextColor={placeholderTextColor}
        multiline={multiline}
        onFocus={handleFocus}
        style={[styles.input, typeStyle, multiline && styles.multiline, style]}
        {...props}
      />
    );
  },
);

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
