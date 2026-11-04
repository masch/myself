import React, {
  createContext,
  useContext,
  type ReactNode,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import {
  View,
  ScrollView,
  FlatList,
  StyleSheet,
  Keyboard,
  TextInput,
  Platform,
  Dimensions,
  type StyleProp,
  type ViewStyle,
  type ScrollViewProps,
  type FlatListProps,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
  type LayoutChangeEvent,
} from "react-native";
import { useSafeAreaInsets, type Edge } from "react-native-safe-area-context";
import { colors, layout, spacing } from "@/theme";
import { useKeyboardInset } from "@/hooks/use-keyboard-inset";
import { useKeyboardDocking } from "@/hooks/use-keyboard-docking";
import { resolveFocusedInputScroll } from "./focus-scroll";

const DEFAULT_EDGES: Edge[] = ["top", "bottom"];
const DEFAULT_TAB_EDGES: Edge[] = ["top"];
const DEFAULT_TOP_OFFSET = layout.screenTopOffset;
const DEFAULT_BOTTOM_OFFSET = layout.screenBottomOffset;
export const DEFAULT_HORIZONTAL_PADDING = layout.screenHorizontalPadding;
const DEFAULT_GAP = layout.cardGap;
const DEFAULT_KEYBOARD_BOTTOM_SPACING = spacing.lg;
const DEFAULT_KEYBOARD_TOP_SPACING = spacing.md;
/**
 * Lists default to no gap: their rows carry their own bottom margin
 * (`ProductPackageCard` does), and a container gap would double the space
 * between two of them.
 */
const DEFAULT_LIST_GAP = 0;

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

/** The safe-area geometry every container shares, without the view-only extras. */
type ScreenGeometryProps = Pick<
  ScreenContainerBaseProps,
  "edges" | "topOffset" | "bottomOffset"
>;

export interface ListScreenContainerProps<ItemT>
  extends FlatListProps<ItemT>, ScreenGeometryProps {
  horizontalPadding?: number;
  gap?: number;
}

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
  // Web has no keyboard events: react-native-web's Keyboard is a no-op, so the
  // visual viewport is the only source of truth for the space the OS keyboard takes.
  const webKeyboardInset = useKeyboardInset();
  const keyboardInset =
    Platform.OS === "web" ? webKeyboardInset : androidKeyboardHeight;

  const scrollInputIntoView = useCallback(
    (input: any, keyboardInset: number) => {
      if (!scrollViewRef.current || !input) return;

      if (typeof input.measureLayout === "function") {
        try {
          input.measureLayout(
            scrollViewRef.current,
            (_left: number, top: number, _width: number, height: number) => {
              // On Android with 3-button navigation or system insets, React Native's
              // keyboard event reports height above the navigation bar, so the system
              // bar is added on top of the keyboard inset. The coordinate system the
              // measurement arrives in differs per platform: see focus-scroll.ts.
              const targetY = resolveFocusedInputScroll({
                top,
                height: height || 48,
                scrollY: scrollYRef.current,
                viewHeight:
                  scrollViewHeightRef.current ||
                  Dimensions.get("window").height,
                keyboardInset,
                bottomInset: Platform.OS === "android" ? insets.bottom : 0,
                viewportRelative: Platform.OS === "web",
                topSpacing: DEFAULT_KEYBOARD_TOP_SPACING,
                bottomSpacing: DEFAULT_KEYBOARD_BOTTOM_SPACING,
              });

              if (targetY !== null) {
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
    },
    [insets.bottom],
  );

  const scrollToFocusedInput = (input: any) => {
    activeInputRef.current = input;
    if (keyboardInset > 0) {
      scrollInputIntoView(input, keyboardInset);
    }
  };

  useEffect(() => {
    if (Platform.OS !== "android" || !Keyboard?.addListener) return;

    const showSub = Keyboard.addListener("keyboardDidShow", (e) => {
      const kbHeight = e.endCoordinates.height;
      keyboardHeightRef.current = kbHeight;
      setAndroidKeyboardHeight(kbHeight);

      setTimeout(() => {
        const focused =
          TextInput.State?.currentlyFocusedInput?.() ?? activeInputRef.current;
        scrollInputIntoView(focused, kbHeight);
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
  }, [scrollInputIntoView]);

  // Web: the inset arrives after the browser shrinks the visual viewport, so the
  // focused field is brought back into view on the same path the Android listener
  // uses. Without it the field keeps its place inside a full-height scroll port
  // and stays behind the keyboard.
  useEffect(() => {
    if (Platform.OS !== "web" || webKeyboardInset <= 0) return;

    const timer = setTimeout(() => {
      const focused =
        TextInput.State?.currentlyFocusedInput?.() ?? activeInputRef.current;
      scrollInputIntoView(focused, webKeyboardInset);
    }, 50);

    return () => clearTimeout(timer);
  }, [webKeyboardInset, scrollInputIntoView]);

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
              (containerPadding.paddingBottom ?? 0) + keyboardInset,
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
 * Container for screens whose content is a virtualised list.
 *
 * A `FlatList` is not a `ScrollView` and cannot reuse `ScrollScreenContainer`: a
 * list of thousands of rows has to keep owning its own scrolling. This container
 * owns everything around that scroll instead — the safe-area geometry, the
 * standard horizontal padding, and the space the software keyboard covers — and
 * docks the focused input above the keyboard so the text being typed and the
 * results under it are on screen at the same time.
 *
 * It provides `ScrollContainerContext` like `ScrollScreenContainer` does, so every
 * input inside the list (header content included) reports its focus and is docked
 * without the screen knowing anything about the geometry.
 */
export function ListScreenContainer<ItemT>({
  edges = DEFAULT_EDGES,
  topOffset = DEFAULT_TOP_OFFSET,
  bottomOffset = DEFAULT_BOTTOM_OFFSET,
  horizontalPadding = DEFAULT_HORIZONTAL_PADDING,
  gap = DEFAULT_LIST_GAP,
  contentContainerStyle,
  style,
  testID,
  keyboardShouldPersistTaps = "handled",
  keyboardDismissMode,
  scrollEventThrottle = 16,
  onScroll,
  ...listProps
}: ListScreenContainerProps<ItemT>) {
  const containerPadding = useScreenPadding({ edges, topOffset, bottomOffset });
  const listRef = useRef<FlatList<ItemT>>(null);
  const docking = useKeyboardDocking(listRef);
  const dockingScroll = docking.handleScroll;

  // react-native-web implements `on-drag` as `dismissKeyboard()` on **every**
  // `scroll` event, not only on a finger drag
  // (node_modules/react-native-web/dist/exports/ScrollView/index.js:244-246). On a
  // phone the browser scrolls the list by itself while the caret is being edited,
  // so `on-drag` blurs the field on the first typed letter and the OS closes the
  // keyboard with it. The web therefore keeps the keyboard up on scroll; native
  // honors whatever the caller asked for, defaulting to `on-drag`.
  const resolvedKeyboardDismissMode: FlatListProps<ItemT>["keyboardDismissMode"] =
    Platform.OS === "web" ? "none" : (keyboardDismissMode ?? "on-drag");

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      // The dock needs to know where the list already is before it moves it.
      dockingScroll(event);
      onScroll?.(event);
    },
    [dockingScroll, onScroll],
  );

  return (
    <ScrollContainerContext.Provider
      value={{ scrollToFocusedInput: docking.scrollToFocusedInput }}
    >
      <FlatList<ItemT>
        {...listProps}
        ref={listRef}
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
              (containerPadding.paddingBottom ?? 0) +
              docking.keyboardInset +
              gap,
            gap,
          },
          contentContainerStyle,
        ]}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        keyboardDismissMode={resolvedKeyboardDismissMode}
        // A scroll listener without a throttle gets one event on react-native-web,
        // and the dock would never learn where the list is.
        onScroll={handleScroll}
        scrollEventThrottle={scrollEventThrottle}
      />
    </ScrollContainerContext.Provider>
  );
}

/**
 * ScreenContainer provides standardized safe-area insets and background styling
 * across all Android and iOS screens, preventing overlaps with system status bar,
 * notch, and home indicator.
 *
 * For scrollable screens, use the compound subcomponent <ScreenContainer.Scroll>,
 * which automatically applies standard horizontal padding and vertical gap. For
 * screens that scroll a virtualised list, use <ScreenContainer.List>.
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
 * The keyboard-aware choice for virtualised lists: `<ScreenContainer.List>` is a
 * `FlatList` that owns the safe-area geometry and docks the focused input above
 * the software keyboard.
 */
ScreenContainer.List = ListScreenContainer;

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
