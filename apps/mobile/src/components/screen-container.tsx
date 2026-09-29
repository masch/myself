import React, {
  createContext,
  useContext,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Keyboard,
  TextInput,
  Platform,
  Dimensions,
  type StyleProp,
  type ViewStyle,
  type ScrollViewProps,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
  type LayoutChangeEvent,
} from "react-native";
import { useSafeAreaInsets, type Edge } from "react-native-safe-area-context";
import { colors, spacing } from "@/theme";

const DEFAULT_EDGES: Edge[] = ["top", "bottom"];
const DEFAULT_TAB_EDGES: Edge[] = ["top"];
const DEFAULT_TOP_OFFSET = spacing.sm;
const DEFAULT_BOTTOM_OFFSET = spacing.md;
const DEFAULT_HORIZONTAL_PADDING = spacing.md;
const DEFAULT_GAP = spacing.md;
const DEFAULT_KEYBOARD_BOTTOM_SPACING = spacing.lg;
const DEFAULT_KEYBOARD_TOP_SPACING = spacing.md;

export interface ScrollContainerContextValue {
  scrollToFocusedInput: (inputHandle: any) => void;
}

export const ScrollContainerContext =
  createContext<ScrollContainerContextValue | null>(null);

export function useScrollContainer() {
  return useContext(ScrollContainerContext);
}

export interface ScreenContainerBaseProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  edges?: Edge[];
  topOffset?: number;
  bottomOffset?: number;
  testID?: string;
}

export type ScreenContainerProps = ScreenContainerBaseProps;
export type TabScreenContainerProps = ScreenContainerBaseProps;

export interface ScrollScreenContainerProps extends ScreenContainerBaseProps {
  contentContainerStyle?: StyleProp<ViewStyle>;
  keyboardShouldPersistTaps?: ScrollViewProps["keyboardShouldPersistTaps"];
  showsVerticalScrollIndicator?: boolean;
  refreshControl?: ScrollViewProps["refreshControl"];
  contentInsetAdjustmentBehavior?: ScrollViewProps["contentInsetAdjustmentBehavior"];
  horizontalPadding?: number;
  gap?: number;
  automaticallyAdjustKeyboardInsets?: boolean;
  onScroll?: ScrollViewProps["onScroll"];
  scrollEventThrottle?: ScrollViewProps["scrollEventThrottle"];
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
 * On Android, automatically adjusts bottom padding and scrolls the focused
 * input into view when the soft keyboard appears.
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
  automaticallyAdjustKeyboardInsets = true,
  onScroll,
  scrollEventThrottle = 16,
}: ScrollScreenContainerProps) {
  const insets = useSafeAreaInsets();
  const containerPadding = useScreenPadding({ edges, topOffset, bottomOffset });
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const scrollViewHeightRef = useRef(0);
  const keyboardHeightRef = useRef(0);
  const activeInputRef = useRef<any>(null);
  const [androidKeyboardHeight, setAndroidKeyboardHeight] = useState(0);

  const scrollInputIntoView = (input: any) => {
    if (!scrollViewRef.current || !input) return;

    if (typeof input.measureLayout === "function") {
      try {
        input.measureLayout(
          scrollViewRef.current,
          (_left: number, top: number, _width: number, height: number) => {
            const inputHeight = height || 48;
            const inputBottom = top + inputHeight;
            const currentScrollY = scrollYRef.current;
            const viewHeight =
              scrollViewHeightRef.current || Dimensions.get("window").height;
            const kbHeight = keyboardHeightRef.current;
            // On Android with 3-button navigation or system insets, React Native's
            // keyboard event reports height above the navigation bar.
            // We combine kbHeight + insets.bottom to accurately clear both the
            // soft keyboard and the system navigation bar across all device types.
            const bottomBlocked =
              kbHeight + (Platform.OS === "android" ? insets.bottom : 0);
            const visibleHeight = Math.max(0, viewHeight - bottomBlocked);
            const targetBottom =
              visibleHeight - DEFAULT_KEYBOARD_BOTTOM_SPACING;

            if (inputBottom - currentScrollY > targetBottom) {
              const targetY = Math.max(0, inputBottom - targetBottom);
              scrollViewRef.current?.scrollTo({ y: targetY, animated: true });
            } else if (top - currentScrollY < DEFAULT_KEYBOARD_TOP_SPACING) {
              const targetY = Math.max(0, top - DEFAULT_KEYBOARD_TOP_SPACING);
              scrollViewRef.current?.scrollTo({ y: targetY, animated: true });
            }
          },
          () => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          },
        );
        return;
      } catch {
        // Fall through to scrollToEnd
      }
    }

    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  const scrollToFocusedInput = (input: any) => {
    activeInputRef.current = input;
    if (keyboardHeightRef.current > 0) {
      scrollInputIntoView(input);
    }
  };

  useEffect(() => {
    if (Platform.OS !== "android" || !Keyboard?.addListener) return;

    const showSub = Keyboard.addListener("keyboardDidShow", (e) => {
      const kbHeight = e.endCoordinates.height;
      keyboardHeightRef.current = kbHeight;
      setAndroidKeyboardHeight(kbHeight);

      const focused =
        activeInputRef.current ?? TextInput.State?.currentlyFocusedInput?.();
      setTimeout(() => {
        scrollInputIntoView(focused);
      }, 50);
    });

    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      keyboardHeightRef.current = 0;
      setAndroidKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [insets.bottom]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollYRef.current = e.nativeEvent.contentOffset.y;
    onScroll?.(e);
  };

  const handleLayout = (e: LayoutChangeEvent) => {
    scrollViewHeightRef.current = e.nativeEvent.layout.height;
  };

  return (
    <ScrollContainerContext.Provider value={{ scrollToFocusedInput }}>
      <ScrollView
        ref={scrollViewRef}
        testID={testID}
        style={[
          styles.container,
          { backgroundColor: colors.systemBackground },
          style,
        ]}
        contentContainerStyle={[
          containerPadding,
          {
            paddingLeft:
              (containerPadding.paddingLeft ?? 0) + horizontalPadding,
            paddingRight:
              (containerPadding.paddingRight ?? 0) + horizontalPadding,
            paddingBottom:
              (containerPadding.paddingBottom ?? 0) + androidKeyboardHeight,
            gap,
          },
          contentContainerStyle,
        ]}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        refreshControl={refreshControl}
        contentInsetAdjustmentBehavior={contentInsetAdjustmentBehavior}
        automaticallyAdjustKeyboardInsets={automaticallyAdjustKeyboardInsets}
        onScroll={handleScroll}
        scrollEventThrottle={scrollEventThrottle}
        onLayout={handleLayout}
      >
        {children}
      </ScrollView>
    </ScrollContainerContext.Provider>
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

/**
 * Specialized container for screens hosted inside tab navigators (e.g. NativeTabs).
 * Defaults edges to ["top"], preventing redundant bottom safe-area insets because
 * the native bottom tab bar already consumes device navigation/home indicator insets.
 */
export function TabScreenContainer({
  edges = DEFAULT_TAB_EDGES,
  ...props
}: TabScreenContainerProps) {
  return <ScreenContainer edges={edges} {...props} />;
}

ScreenContainer.Tab = TabScreenContainer;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
