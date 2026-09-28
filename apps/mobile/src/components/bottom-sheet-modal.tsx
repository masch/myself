import React, { type ReactNode, useEffect, useState } from "react";
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  Dimensions,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { colors, spacing, radius } from "@/theme";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

export interface BottomSheetModalBaseProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: number;
  sheetStyle?: StyleProp<ViewStyle>;
  testID?: string;
  keyboardVerticalOffset?: number;
  isKeyboardVisible?: boolean;
}

export interface BottomSheetModalProps extends BottomSheetModalBaseProps {
  scrollable?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

export interface BottomSheetModalScrollProps extends BottomSheetModalBaseProps {
  contentContainerStyle?: StyleProp<ViewStyle>;
}

/**
 * Returns the safe area edges for the bottom sheet modal.
 * When keyboard is open, bottom insets must be omitted so action buttons
 * sit cleanly above the software keyboard without redundant empty gap.
 */
export function getBottomSheetSafeAreaEdges(
  isKeyboardVisible: boolean,
): ["bottom"] | [] {
  return isKeyboardVisible ? [] : ["bottom"];
}

/**
 * Tracks software keyboard visibility. When the keyboard is active,
 * it occupies the bottom of the display above the system navigation bar,
 * so modals must omit bottom safe-area insets to avoid redundant gap.
 */
export function useIsKeyboardVisible(): boolean {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(() => {
    try {
      return typeof Keyboard?.isVisible === "function"
        ? Keyboard.isVisible()
        : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!Keyboard?.addListener) return;

    const handleShow = () => setIsKeyboardVisible(true);
    const handleHide = () => setIsKeyboardVisible(false);

    const showSub1 = Keyboard.addListener("keyboardDidShow", handleShow);
    const hideSub1 = Keyboard.addListener("keyboardDidHide", handleHide);
    const showSub2 = Keyboard.addListener("keyboardWillShow", handleShow);
    const hideSub2 = Keyboard.addListener("keyboardWillHide", handleHide);

    return () => {
      showSub1?.remove?.();
      hideSub1?.remove?.();
      showSub2?.remove?.();
      hideSub2?.remove?.();
    };
  }, []);

  return isKeyboardVisible;
}

export interface BottomSheetModalContentProps {
  onClose: () => void;
  maxWidth?: number;
  sheetStyle?: StyleProp<ViewStyle>;
  keyboardVerticalOffset?: number;
  innerContent: ReactNode;
  isKeyboardVisible?: boolean;
}

export function BottomSheetModalContent({
  onClose,
  maxWidth = 580,
  sheetStyle,
  keyboardVerticalOffset = 0,
  innerContent,
  isKeyboardVisible: controlledKeyboardVisible,
}: BottomSheetModalContentProps) {
  const { height: windowHeight } = useWindowDimensions();
  const screenHeight = Dimensions.get("screen")?.height ?? 0;
  const [containerHeight, setContainerHeight] = useState<number | null>(null);
  const isKeyboardByListener = useIsKeyboardVisible();

  // In Android native Dialog windows (Modal), Keyboard.addListener doesn't fire
  // because the Dialog runs in a separate window from ReactRootView.
  // However, Android's adjustResize physically resizes the Dialog window,
  // causing container onLayout and useWindowDimensions to shrink significantly (> 100dp).
  const effectiveHeight = containerHeight ?? windowHeight;
  const isKeyboardByLayout =
    screenHeight > 200 &&
    effectiveHeight > 0 &&
    screenHeight - effectiveHeight > 100;

  const isKeyboardVisible =
    controlledKeyboardVisible ?? (isKeyboardByListener || isKeyboardByLayout);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={keyboardVerticalOffset}
      style={styles.backdrop}
      onLayout={(e) => {
        setContainerHeight(e.nativeEvent.layout.height);
      }}
    >
      <Pressable
        style={styles.scrim}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Cerrar modal"
      />

      <SafeAreaView
        edges={getBottomSheetSafeAreaEdges(isKeyboardVisible)}
        style={[
          styles.sheet,
          {
            maxWidth,
            backgroundColor: colors.secondarySystemBackground,
          },
          sheetStyle,
        ]}
      >
        <View style={styles.dragIndicator} />
        {innerContent}
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

// Backwards-compatibility alias for tests
export const BottomSheetBody = BottomSheetModalContent;

function renderModalShell({
  visible,
  onClose,
  maxWidth = 580,
  sheetStyle,
  testID,
  keyboardVerticalOffset = 0,
  innerContent,
  isKeyboardVisible,
}: BottomSheetModalBaseProps & {
  innerContent: ReactNode;
}) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      testID={testID}
      accessibilityViewIsModal
      statusBarTranslucent
      navigationBarTranslucent
    >
      <SafeAreaProvider style={styles.provider}>
        <BottomSheetModalContent
          onClose={onClose}
          maxWidth={maxWidth}
          sheetStyle={sheetStyle}
          keyboardVerticalOffset={keyboardVerticalOffset}
          innerContent={innerContent}
          isKeyboardVisible={isKeyboardVisible}
        />
      </SafeAreaProvider>
    </Modal>
  );
}

export function AppBottomSheetModalScroll(props: BottomSheetModalScrollProps) {
  if (!props.visible) return null;

  return renderModalShell({
    ...props,
    innerContent: (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          props.contentContainerStyle,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {props.children}
      </ScrollView>
    ),
  });
}

export function AppBottomSheetModalRoot({
  scrollable = true,
  ...props
}: BottomSheetModalProps) {
  if (!props.visible) return null;

  if (scrollable) {
    return renderModalShell({
      ...props,
      innerContent: (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            props.contentContainerStyle,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {props.children}
        </ScrollView>
      ),
    });
  }

  return renderModalShell({
    ...props,
    innerContent: (
      <View style={[styles.nonScrollContent, props.contentContainerStyle]}>
        {props.children}
      </View>
    ),
  });
}

export const AppBottomSheetModal = Object.assign(AppBottomSheetModalRoot, {
  Scroll: AppBottomSheetModalScroll,
});

const styles = StyleSheet.create({
  provider: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.scrim,
  },
  sheet: {
    width: "100%",
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderCurve: "continuous",
    maxHeight: "90%",
    paddingTop: spacing.sm + 4,
    paddingBottom: spacing.md,
    overflow: "hidden",
  },
  dragIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.systemGray,
    alignSelf: "center",
    marginBottom: spacing.md,
  },

  scrollView: {
    width: "100%",
  },
  scrollContent: {
    paddingHorizontal: spacing.lg - 4,
    paddingBottom: 0,
  },
  nonScrollContent: {
    paddingHorizontal: spacing.lg - 4,
    paddingBottom: 0,
  },
});
