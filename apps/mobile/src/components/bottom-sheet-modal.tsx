import React, { type ReactNode } from "react";
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { colors, spacing, radius } from "@/theme";

export interface BottomSheetModalBaseProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: number;
  sheetStyle?: StyleProp<ViewStyle>;
  testID?: string;
  keyboardVerticalOffset?: number;
}

export interface BottomSheetModalProps extends BottomSheetModalBaseProps {
  scrollable?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

export interface BottomSheetModalScrollProps extends BottomSheetModalBaseProps {
  contentContainerStyle?: StyleProp<ViewStyle>;
}

function renderModalShell({
  visible,
  onClose,
  maxWidth = 580,
  sheetStyle,
  testID,
  keyboardVerticalOffset = 0,
  innerContent,
}: BottomSheetModalBaseProps & { innerContent: ReactNode }) {
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
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={keyboardVerticalOffset}
        style={styles.backdrop}
      >
        <Pressable
          style={styles.scrim}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Cerrar modal"
        />

        <View
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
        </View>
      </KeyboardAvoidingView>
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
    return AppBottomSheetModalScroll(props);
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
