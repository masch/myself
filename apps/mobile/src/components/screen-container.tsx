import React, { type ReactNode } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
  type ScrollViewProps,
} from "react-native";
import { useSafeAreaInsets, type Edge } from "react-native-safe-area-context";
import { colors } from "@/theme/colors";

export interface ScreenContainerProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollable?: boolean;
  edges?: Edge[];
  topOffset?: number;
  bottomOffset?: number;
  testID?: string;
  keyboardShouldPersistTaps?: ScrollViewProps["keyboardShouldPersistTaps"];
  showsVerticalScrollIndicator?: boolean;
  refreshControl?: ScrollViewProps["refreshControl"];
}

/**
 * ScreenContainer provides standardized safe-area insets and background styling
 * across all Android and iOS screens, preventing overlaps with system status bar,
 * notch, and home indicator. Supports both fixed view layouts and scrollable layouts.
 */
export function ScreenContainer({
  children,
  style,
  contentContainerStyle,
  scrollable = false,
  edges = ["top"],
  topOffset = 0,
  bottomOffset = 0,
  testID,
  keyboardShouldPersistTaps = "handled",
  showsVerticalScrollIndicator,
  refreshControl,
}: ScreenContainerProps) {
  const insets = useSafeAreaInsets();

  const containerPadding: ViewStyle = {
    paddingTop: edges.includes("top") ? insets.top + topOffset : 0,
    paddingBottom: edges.includes("bottom") ? insets.bottom + bottomOffset : 0,
    paddingLeft: edges.includes("left") ? insets.left : 0,
    paddingRight: edges.includes("right") ? insets.right : 0,
  };

  if (scrollable) {
    return (
      <ScrollView
        testID={testID}
        style={[
          styles.container,
          { backgroundColor: colors.systemBackground },
          style,
        ]}
        contentContainerStyle={[containerPadding, contentContainerStyle]}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        refreshControl={refreshControl}
        contentInsetAdjustmentBehavior="automatic"
      >
        {children}
      </ScrollView>
    );
  }

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
