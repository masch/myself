import React, { type ReactNode } from "react";
import {
  View,
  Switch,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
  type SwitchProps,
} from "react-native";

import { colors, spacing } from "@/theme";
import { ThemedText } from "./themed-text";
import { Card } from "./surface";
import { SegmentedControl } from "./segmented-control";

export interface NativeSwitchProps extends Omit<SwitchProps, "style"> {
  style?: StyleProp<ViewStyle>;
}

export function NativeSwitch({
  value,
  onValueChange,
  disabled,
  style,
  ...props
}: NativeSwitchProps) {
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{
        false: colors.systemGray15,
        true: colors.systemGreen,
      }}
      thumbColor={colors.white}
      ios_backgroundColor={colors.systemGray15}
      style={style}
      {...props}
    />
  );
}

export interface NativePickerProps<T extends string> {
  value: T;
  onValueChange: (val: T) => void;
  options: { label: string; value: T }[];
  style?: StyleProp<ViewStyle>;
}

export function NativePicker<T extends string>({
  value,
  onValueChange,
  options,
  style,
}: NativePickerProps<T>) {
  return (
    <SegmentedControl
      values={options}
      selectedValue={value}
      onValueChange={onValueChange}
      style={style}
    />
  );
}

export interface NativeListItemProps {
  children: ReactNode;
  supportingText?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  layout?: "horizontal" | "vertical";
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function NativeListItem({
  children,
  supportingText,
  leading,
  trailing,
  layout,
  onPress,
  style,
  testID,
}: NativeListItemProps) {
  const isWideControl =
    React.isValidElement(trailing) &&
    (trailing.type === NativePicker ||
      trailing.type === SegmentedControl ||
      (trailing.props as any)?.options !== undefined ||
      (trailing.props as any)?.values !== undefined);

  const effectiveLayout = layout ?? (isWideControl ? "vertical" : "horizontal");
  const isVertical = effectiveLayout === "vertical";

  const content = (
    <View
      style={[
        styles.itemContainer,
        isVertical && styles.itemContainerVertical,
        style,
      ]}
      testID={testID}
    >
      <View style={isVertical ? styles.topRow : styles.rowContent}>
        {leading ? (
          <View style={styles.leadingContainer}>{leading}</View>
        ) : null}
        <View style={styles.labelContainer}>
          {typeof children === "string" ? (
            <ThemedText variant="body" style={styles.itemTitle}>
              {children}
            </ThemedText>
          ) : (
            children
          )}
          {supportingText ? (
            <ThemedText
              variant="caption1"
              color={colors.secondaryLabel}
              style={styles.supportingText}
            >
              {supportingText}
            </ThemedText>
          ) : null}
        </View>
        {!isVertical && trailing ? (
          <View style={styles.trailingContainer}>{trailing}</View>
        ) : null}
      </View>
      {isVertical && trailing ? (
        <View style={styles.bottomContainer}>{trailing}</View>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [pressed && styles.itemPressed]}
        accessibilityRole="button"
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

export interface NativeFieldGroupSectionProps {
  title?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function NativeFieldGroupSection({
  title,
  children,
  style,
}: NativeFieldGroupSectionProps) {
  return (
    <View style={[styles.section, style]}>
      {title ? (
        <ThemedText
          variant="caption1"
          color={colors.secondaryLabel}
          style={styles.sectionHeader}
        >
          {title.toUpperCase()}
        </ThemedText>
      ) : null}
      <Card variant="subdued" padding="none" style={styles.cardContainer}>
        {React.Children.map(children, (child, index) => {
          if (!React.isValidElement(child)) return child;
          const isLast = index === React.Children.count(children) - 1;
          return (
            <React.Fragment key={index}>
              {child}
              {!isLast ? <View style={styles.divider} /> : null}
            </React.Fragment>
          );
        })}
      </Card>
    </View>
  );
}

export interface NativeFieldGroupProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function NativeFieldGroupRoot({
  children,
  style,
}: NativeFieldGroupProps) {
  return <View style={[styles.groupRoot, style]}>{children}</View>;
}

export const NativeFieldGroup = Object.assign(NativeFieldGroupRoot, {
  Section: NativeFieldGroupSection,
});

const styles = StyleSheet.create({
  groupRoot: {
    width: "100%",
    gap: spacing.lg,
  },
  section: {
    width: "100%",
  },
  sectionHeader: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xs,
    letterSpacing: 0.5,
    fontWeight: "600",
  },
  cardContainer: {
    overflow: "hidden",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.separator,
    marginLeft: spacing.lg,
  },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    minHeight: 48,
  },
  itemContainerVertical: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: spacing.sm + 2,
    paddingVertical: spacing.md,
  },
  rowContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  bottomContainer: {
    width: "100%",
    marginTop: spacing.xs,
  },
  itemPressed: {
    opacity: 0.7,
  },
  leadingContainer: {
    marginRight: spacing.sm + 4,
    justifyContent: "center",
    alignItems: "center",
  },
  labelContainer: {
    flex: 1,
    justifyContent: "center",
  },
  itemTitle: {
    fontWeight: "400",
  },
  supportingText: {
    marginTop: 2,
  },
  trailingContainer: {
    marginLeft: spacing.sm,
    justifyContent: "center",
    alignItems: "flex-end",
  },
});
