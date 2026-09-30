import React, { forwardRef, useImperativeHandle, useRef } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  type ViewProps,
  type TextInputProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
  type NativeSyntheticEvent,
  type TargetedEvent,
} from "react-native";
import {
  colors,
  layout,
  spacing,
  typography,
  type TypographyVariant,
} from "@/theme";
import { useScrollContainer } from "./screen-container";

export interface FormRowProps extends ViewProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function FormRow({ children, style, ...props }: FormRowProps) {
  return (
    <View style={[styles.row, style]} {...props}>
      {children}
    </View>
  );
}

export interface FormRowLeadingProps extends ViewProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function FormRowLeading({
  children,
  style,
  ...props
}: FormRowLeadingProps) {
  return (
    <View style={[styles.leading, style]} {...props}>
      {children}
    </View>
  );
}

export interface FormRowTrailingProps extends ViewProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function FormRowTrailing({
  children,
  style,
  ...props
}: FormRowTrailingProps) {
  return (
    <View style={[styles.trailing, style]} {...props}>
      {children}
    </View>
  );
}

export interface FormRowInputProps extends TextInputProps {
  variant?: TypographyVariant;
  style?: StyleProp<TextStyle>;
}

export const FormRowInput = forwardRef<TextInput, FormRowInputProps>(
  function FormRowInput(
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

    const finalAccessibilityLabel =
      props.accessibilityLabel ??
      (typeof props.placeholder === "string" ? props.placeholder : undefined);

    return (
      <TextInput
        ref={internalRef}
        placeholderTextColor={placeholderTextColor}
        multiline={multiline}
        onFocus={handleFocus}
        accessibilityLabel={finalAccessibilityLabel}
        aria-label={finalAccessibilityLabel}
        style={[
          styles.input,
          typeStyle,
          { color: colors.label },
          multiline && styles.multilineInput,
          style,
        ]}
        {...props}
      />
    );
  },
);

FormRow.Leading = FormRowLeading;
FormRow.Input = FormRowInput;
FormRow.Trailing = FormRowTrailing;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: layout.rowHeight,
    paddingVertical: layout.rowPaddingVertical,
    gap: spacing.md,
  },
  leading: {
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    flex: 1,
    paddingVertical: 0,
  },
  multilineInput: {
    textAlignVertical: "top",
    paddingTop: spacing.xs,
  },
  trailing: {
    justifyContent: "center",
    alignItems: "center",
  },
});
