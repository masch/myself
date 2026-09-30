import React from "react";
import {
  View,
  StyleSheet,
  type ViewProps,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
  type ImageStyle,
  type ColorValue,
} from "react-native";
import { colors, spacing, type SpacingKey } from "@/theme";
import { AppIcon } from "./app-icon";
import { Card, type SurfaceVariant } from "./surface";
import { ThemedText, type ThemedTextProps } from "./themed-text";

export interface EmptyStateProps extends ViewProps {
  icon?: string;
  iconColor?: ColorValue;
  iconSize?: number;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export interface EmptyStateCardProps extends ViewProps {
  variant?: SurfaceVariant;
  padding?: SpacingKey | "none";
  icon?: string;
  iconColor?: ColorValue;
  iconSize?: number;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export interface EmptyStateIconProps {
  name?: string;
  size?: number;
  color?: ColorValue;
  style?: StyleProp<ImageStyle>;
  children?: React.ReactNode;
}

export interface EmptyStateTitleProps extends Omit<
  ThemedTextProps,
  "children"
> {
  children?: React.ReactNode;
  style?: StyleProp<TextStyle>;
}

export interface EmptyStateDescriptionProps extends Omit<
  ThemedTextProps,
  "children"
> {
  children?: React.ReactNode;
  style?: StyleProp<TextStyle>;
}

export interface EmptyStateActionProps extends ViewProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function EmptyStateIcon({
  name,
  size = 40,
  color,
  style,
  children,
}: EmptyStateIconProps) {
  if (children) {
    return <View style={styles.iconContainer}>{children}</View>;
  }
  if (!name) return null;
  return (
    <AppIcon
      name={name}
      size={size}
      color={color ?? colors.secondaryLabel}
      style={style}
    />
  );
}

export function EmptyStateTitle({
  children,
  variant = "title2",
  style,
  ...props
}: EmptyStateTitleProps) {
  return (
    <ThemedText variant={variant} style={[styles.title, style]} {...props}>
      {children}
    </ThemedText>
  );
}

export function EmptyStateDescription({
  children,
  variant = "callout",
  color = colors.secondaryLabel,
  style,
  ...props
}: EmptyStateDescriptionProps) {
  return (
    <ThemedText
      variant={variant}
      color={color}
      style={[styles.description, style]}
      {...props}
    >
      {children}
    </ThemedText>
  );
}

export function EmptyStateAction({
  children,
  style,
  ...props
}: EmptyStateActionProps) {
  return (
    <View style={[styles.action, style]} {...props}>
      {children}
    </View>
  );
}

export function EmptyState({
  icon,
  iconColor,
  iconSize,
  title,
  description,
  action,
  children,
  style,
  ...props
}: EmptyStateProps) {
  return (
    <View style={[styles.container, style]} {...props}>
      {icon && <EmptyStateIcon name={icon} color={iconColor} size={iconSize} />}
      {title && <EmptyStateTitle>{title}</EmptyStateTitle>}
      {description && (
        <EmptyStateDescription>{description}</EmptyStateDescription>
      )}
      {action && <EmptyStateAction>{action}</EmptyStateAction>}
      {children}
    </View>
  );
}

export function EmptyStateCard({
  variant = "subdued",
  padding = "xl",
  icon,
  iconColor,
  iconSize,
  title,
  description,
  action,
  children,
  style,
  ...props
}: EmptyStateCardProps) {
  return (
    <Card
      variant={variant}
      padding={padding}
      style={[styles.container, style]}
      {...props}
    >
      {icon && <EmptyStateIcon name={icon} color={iconColor} size={iconSize} />}
      {title && <EmptyStateTitle>{title}</EmptyStateTitle>}
      {description && (
        <EmptyStateDescription>{description}</EmptyStateDescription>
      )}
      {action && <EmptyStateAction>{action}</EmptyStateAction>}
      {children}
    </Card>
  );
}

EmptyState.Card = EmptyStateCard;
EmptyState.Icon = EmptyStateIcon;
EmptyState.Title = EmptyStateTitle;
EmptyState.Description = EmptyStateDescription;
EmptyState.Action = EmptyStateAction;

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm + 2,
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    textAlign: "center",
  },
  description: {
    textAlign: "center",
    lineHeight: 20,
  },
  action: {
    alignItems: "center",
    marginTop: spacing.xs,
  },
});
