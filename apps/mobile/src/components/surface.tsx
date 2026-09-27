import React from "react";
import {
  View,
  type ViewProps,
  type ViewStyle,
  StyleSheet,
  type StyleProp,
} from "react-native";
import { colors, radius, shadows, spacing, type SpacingKey } from "@/theme";

export type SurfaceVariant = "elevated" | "outlined" | "subdued";

export interface SurfaceProps extends ViewProps {
  variant?: SurfaceVariant;
  padding?: SpacingKey | "none";
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export function Surface({
  variant = "subdued",
  padding = "md",
  style,
  children,
  ...props
}: SurfaceProps) {
  const variantStyle = variantStyles[variant];
  const paddingValue = padding === "none" ? 0 : spacing[padding];

  return (
    <View
      style={[
        styles.base,
        variantStyle,
        paddingValue !== undefined ? { padding: paddingValue } : null,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

export const Card = Surface;

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    borderCurve: "continuous",
    overflow: "hidden",
  },
});

const variantStyles: Record<SurfaceVariant, ViewStyle> = {
  elevated: {
    backgroundColor: colors.secondarySystemBackground,
    boxShadow: shadows.card,
  },
  outlined: {
    backgroundColor: colors.systemBackground,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.separator,
  },
  subdued: {
    backgroundColor: colors.secondarySystemBackground,
  },
};
