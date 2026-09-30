import React from "react";
import {
  ActivityIndicator,
  View,
  StyleSheet,
  type ActivityIndicatorProps,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
  type ColorValue,
} from "react-native";
import { colors, spacing } from "@/theme";
import { ThemedText, type ThemedTextProps } from "./themed-text";

export type SpinnerSize = "sm" | "md" | "lg";

export interface SpinnerProps extends Omit<
  ActivityIndicatorProps,
  "size" | "color"
> {
  size?: SpinnerSize | number;
  color?: ColorValue;
  label?: string;
  style?: StyleProp<ViewStyle>;
}

export interface CenteredSpinnerProps extends SpinnerProps {
  style?: StyleProp<ViewStyle>;
}

export interface SpinnerLabelProps extends Omit<ThemedTextProps, "children"> {
  children?: React.ReactNode;
  style?: StyleProp<TextStyle>;
}

export function SpinnerLabel({
  children,
  variant = "caption1",
  color = colors.secondaryLabel,
  style,
  ...props
}: SpinnerLabelProps) {
  return (
    <ThemedText
      variant={variant}
      color={color}
      style={[styles.label, style]}
      {...props}
    >
      {children}
    </ThemedText>
  );
}

export function Spinner({
  size = "md",
  color = colors.systemBlue,
  label,
  style,
  animating = true,
  ...props
}: SpinnerProps) {
  const indicatorSize =
    typeof size === "number" ? size : size === "lg" ? "large" : "small";

  return (
    <View style={[styles.inlineContainer, style]}>
      <ActivityIndicator
        animating={animating}
        size={indicatorSize}
        color={color as string}
        accessibilityRole="progressbar"
        {...props}
      />
      {label && <SpinnerLabel>{label}</SpinnerLabel>}
    </View>
  );
}

export function CenteredSpinner({
  size = "lg",
  color,
  label,
  style,
  ...props
}: CenteredSpinnerProps) {
  return (
    <View style={[styles.centerContainer, style]}>
      <Spinner size={size} color={color} label={label} {...props} />
    </View>
  );
}

Spinner.Centered = CenteredSpinner;
Spinner.Label = SpinnerLabel;

const styles = StyleSheet.create({
  inlineContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    gap: spacing.sm,
  },
  label: {
    textAlign: "center",
  },
});
