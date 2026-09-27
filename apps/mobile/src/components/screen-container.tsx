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
import { colors } from "@/theme";

const DEFAULT_EDGES: Edge[] = ["top", "bottom"];
const DEFAULT_TOP_OFFSET = 8;
const DEFAULT_BOTTOM_OFFSET = 16;
const DEFAULT_HORIZONTAL_PADDING = 16;
const DEFAULT_GAP = 16;

export interface ScreenContainerBaseProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  edges?: Edge[];
  topOffset?: number;
  bottomOffset?: number;
  testID?: string;
}

export type ScreenContainerProps = ScreenContainerBaseProps;

export interface ScrollScreenContainerProps extends ScreenContainerBaseProps {
  contentContainerStyle?: StyleProp<ViewStyle>;
  keyboardShouldPersistTaps?: ScrollViewProps["keyboardShouldPersistTaps"];
  showsVerticalScrollIndicator?: boolean;
  refreshControl?: ScrollViewProps["refreshControl"];
  contentInsetAdjustmentBehavior?: ScrollViewProps["contentInsetAdjustmentBehavior"];
  horizontalPadding?: number;
  gap?: number;
}

export interface ScreenPaddingStyle {
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
}

/**
 * Single source of truth for calculating safe-area padding with configurable edges and offsets.
 */
export function useScreenPadding({
  edges = DEFAULT_EDGES,
  topOffset = DEFAULT_TOP_OFFSET,
  bottomOffset = DEFAULT_BOTTOM_OFFSET,
}: Pick<
  ScreenContainerBaseProps,
  "edges" | "topOffset" | "bottomOffset"
> = {}): ScreenPaddingStyle {
  const insets = useSafeAreaInsets();

  return {
    paddingTop: edges.includes("top") ? insets.top + topOffset : 0,
    paddingBottom: edges.includes("bottom") ? insets.bottom + bottomOffset : 0,
    paddingLeft: edges.includes("left") ? insets.left : 0,
    paddingRight: edges.includes("right") ? insets.right : 0,
  };
}

/**
 * Specialized scrollable container with standardized safe-area insets,
 * default horizontal padding (16dp), and vertical section gap (16dp).
 */
export function ScrollScreenContainer({
  children,
  style,
  contentContainerStyle,
  edges = DEFAULT_EDGES,
  topOffset = DEFAULT_TOP_OFFSET,
  bottomOffset = DEFAULT_BOTTOM_OFFSET,
  horizontalPadding = DEFAULT_HORIZONTAL_PADDING,
  gap = DEFAULT_GAP,
  testID,
  keyboardShouldPersistTaps = "handled",
  showsVerticalScrollIndicator,
  refreshControl,
  contentInsetAdjustmentBehavior = "never",
}: ScrollScreenContainerProps) {
  const containerPadding = useScreenPadding({ edges, topOffset, bottomOffset });

  return (
    <ScrollView
      testID={testID}
      style={[
        styles.container,
        { backgroundColor: colors.systemBackground },
        style,
      ]}
      contentContainerStyle={[
        containerPadding,
        {
          paddingLeft: (containerPadding.paddingLeft ?? 0) + horizontalPadding,
          paddingRight:
            (containerPadding.paddingRight ?? 0) + horizontalPadding,
          gap,
        },
        contentContainerStyle,
      ]}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      refreshControl={refreshControl}
      contentInsetAdjustmentBehavior={contentInsetAdjustmentBehavior}
    >
      {children}
    </ScrollView>
  );
}

/**
 * ScreenContainer provides standardized safe-area insets and background styling
 * across all Android and iOS screens, preventing overlaps with system status bar,
 * notch, and home indicator.
 *
 * For scrollable screens, use the compound subcomponent <ScreenContainer.Scroll>,
 * which automatically applies standard horizontal padding and vertical gap.
 */
export function ScreenContainer({
  children,
  style,
  edges = DEFAULT_EDGES,
  topOffset = DEFAULT_TOP_OFFSET,
  bottomOffset = DEFAULT_BOTTOM_OFFSET,
  testID,
}: ScreenContainerProps) {
  const containerPadding = useScreenPadding({ edges, topOffset, bottomOffset });

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

ScreenContainer.Scroll = ScrollScreenContainer;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
