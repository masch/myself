import React, { type ReactNode } from "react";
import { View, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets, type Edge } from "react-native-safe-area-context";
import { colors } from "@/theme/colors";

export interface ScreenContainerProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  edges?: Edge[];
  topOffset?: number;
  bottomOffset?: number;
  testID?: string;
}

/**
 * ScreenContainer provides standardized safe-area insets and background styling
 * across all Android and iOS screens, preventing overlaps with system status bar,
 * notch, and home indicator.
 */
export function ScreenContainer({
  children,
  style,
  edges = ["top"],
  topOffset = 0,
  bottomOffset = 0,
  testID,
}: ScreenContainerProps) {
  const insets = useSafeAreaInsets();

  const containerPadding: ViewStyle = {
    paddingTop: edges.includes("top") ? insets.top + topOffset : 0,
    paddingBottom: edges.includes("bottom") ? insets.bottom + bottomOffset : 0,
    paddingLeft: edges.includes("left") ? insets.left : 0,
    paddingRight: edges.includes("right") ? insets.right : 0,
  };

  return (
    <View
      testID={testID}
      style={[
        styles.container,
        { backgroundColor: colors.systemBackground },
        containerPadding,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
