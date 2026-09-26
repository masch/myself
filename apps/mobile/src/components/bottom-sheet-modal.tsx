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
import { colors } from "@/theme/colors";

export interface BottomSheetModalProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: number;
  scrollable?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  sheetStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

export function AppBottomSheetModal({
  visible,
  onClose,
  children,
  maxWidth = 580,
  scrollable = true,
  contentContainerStyle,
  sheetStyle,
  testID,
}: BottomSheetModalProps) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      testID={testID}
      accessibilityViewIsModal
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
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

          {scrollable ? (
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={[
                styles.scrollContent,
                contentContainerStyle,
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {children}
            </ScrollView>
          ) : (
            <View style={[styles.nonScrollContent, contentContainerStyle]}>
              {children}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    paddingTop: 12,
    paddingBottom: 36,
    overflow: "hidden",
  },
  dragIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.systemGray,
    alignSelf: "center",
    marginBottom: 16,
  },
  scrollView: {
    width: "100%",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  nonScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
});
