import React, { createContext, useContext } from "react";
import {
  View,
  StyleSheet,
  type ViewProps,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
  type ColorValue,
} from "react-native";
import { colors, radius } from "@/theme";
import { AppIcon } from "./app-icon";
import { ThemedText, type ThemedTextProps } from "./themed-text";

export type BadgeVariant =
  | "neutral"
  | "primary"
  | "success"
  | "warning"
  | "destructive"
  | "purple"
  | "outline";

export type BadgeSize = "sm" | "md" | "lg";

interface BadgeContextValue {
  size: BadgeSize;
  textColor: ColorValue;
}

const BadgeContext = createContext<BadgeContextValue>({
  size: "md",
  textColor: colors.label,
});

export interface BadgeProps extends ViewProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  label?: string | number;
  icon?: string;
  backgroundColor?: ColorValue;
  textColor?: ColorValue;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export interface BadgeTextProps extends Omit<ThemedTextProps, "children"> {
  children?: React.ReactNode;
  style?: StyleProp<TextStyle>;
}

export interface BadgeIconProps {
  name: string;
  size?: number;
  color?: ColorValue;
  style?: StyleProp<TextStyle>;
}

export function BadgeText({ children, style, ...props }: BadgeTextProps) {
  const { size, textColor } = useContext(BadgeContext);
  const textVariant =
    size === "sm" ? "caption2" : size === "lg" ? "callout" : "caption1";

  return (
    <ThemedText
      variant={textVariant}
      color={textColor}
      style={[styles.text, style]}
      {...props}
    >
      {children}
    </ThemedText>
  );
}

export function BadgeIcon({
  name,
  size: iconSize,
  color,
  style,
}: BadgeIconProps) {
  const { size, textColor } = useContext(BadgeContext);
  const resolvedSize =
    iconSize ?? (size === "sm" ? 10 : size === "lg" ? 16 : 12);

  return (
    <AppIcon
      name={name}
      size={resolvedSize}
      color={color ?? textColor}
      style={style as any}
    />
  );
}

export function Badge({
  variant = "neutral",
  size = "md",
  label,
  icon,
  backgroundColor,
  textColor: customTextColor,
  children,
  style,
  ...props
}: BadgeProps) {
  const config = variantConfigs[variant];
  const resolvedBg = backgroundColor ?? config.backgroundColor;
  const resolvedText = customTextColor ?? config.textColor;

  return (
    <BadgeContext.Provider value={{ size, textColor: resolvedText }}>
      <View
        style={[
          styles.badge,
          sizeStyles[size],
          { backgroundColor: resolvedBg },
          variant === "outline" && styles.outlineBadge,
          style,
        ]}
        accessibilityRole="text"
        {...props}
      >
        {icon && <BadgeIcon name={icon} />}
        {label !== undefined && <BadgeText>{label}</BadgeText>}
        {children}
      </View>
    </BadgeContext.Provider>
  );
}

Badge.Text = BadgeText;
Badge.Icon = BadgeIcon;

const variantConfigs: Record<
  BadgeVariant,
  { backgroundColor: ColorValue; textColor: ColorValue }
> = {
  neutral: {
    backgroundColor: colors.systemGray15,
    textColor: colors.label,
  },
  primary: {
    backgroundColor: colors.systemBlue,
    textColor: colors.white,
  },
  success: {
    backgroundColor: colors.systemGreen,
    textColor: colors.white,
  },
  warning: {
    backgroundColor: colors.systemOrange,
    textColor: colors.white,
  },
  destructive: {
    backgroundColor: colors.systemRed,
    textColor: colors.white,
  },
  purple: {
    backgroundColor: colors.systemPurple,
    textColor: colors.white,
  },
  outline: {
    backgroundColor: "transparent",
    textColor: colors.secondaryLabel,
  },
};

const sizeStyles = StyleSheet.create({
  sm: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 3,
  },
  md: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  lg: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
  },
});

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: radius.full,
    borderCurve: "continuous",
  },
  outlineBadge: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.separator,
  },
  text: {
    fontWeight: "600",
  },
});
