import React from "react";
import {
  View,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { colors, spacing, radius, shadows } from "@/theme";
import { ThemedText } from "./themed-text";

export interface SegmentedControlItem<T extends string = string> {
  value: T;
  label: string;
  testID?: string;
  badge?: string | number;
}

export interface SegmentedControlProps<T extends string = string> {
  values: SegmentedControlItem<T>[] | readonly SegmentedControlItem<T>[];
  selectedValue: T;
  onValueChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

export function SegmentedControl<T extends string = string>({
  values,
  selectedValue,
  onValueChange,
  style,
  disabled = false,
}: SegmentedControlProps<T>) {
  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.container,
        { backgroundColor: colors.secondarySystemBackground },
        style,
      ]}
    >
      {values.map((item) => {
        const isSelected = item.value === selectedValue;

        return (
          <Pressable
            key={item.value}
            testID={item.testID}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            aria-selected={isSelected}
            disabled={disabled}
            onPress={() => onValueChange(item.value)}
            style={({ pressed }) => [
              styles.segment,
              isSelected && [
                styles.segmentActive,
                { backgroundColor: colors.systemBlue },
              ],
              { opacity: disabled ? 0.5 : pressed ? 0.7 : 1 },
            ]}
          >
            <ThemedText
              variant="callout"
              style={[
                styles.label,
                {
                  color: isSelected ? colors.white : colors.secondaryLabel,
                  fontWeight: isSelected ? "600" : "500",
                },
              ]}
            >
              {item.label}
            </ThemedText>

            {item.badge !== undefined && (
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: isSelected
                      ? "rgba(255, 255, 255, 0.25)"
                      : colors.systemGray15,
                  },
                ]}
              >
                <ThemedText
                  variant="caption2"
                  style={[
                    styles.badgeText,
                    {
                      color: isSelected ? colors.white : colors.secondaryLabel,
                    },
                  ]}
                >
                  {item.badge}
                </ThemedText>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderRadius: radius.md,
    padding: 3,
    gap: 4,
  },
  segment: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm - 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md - 2,
    borderCurve: "continuous",
    gap: 6,
  },
  segmentActive: {
    boxShadow: shadows.card,
  },
  label: {
    textAlign: "center",
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
  },
  badgeText: {
    fontWeight: "600",
  },
});
