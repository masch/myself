import React, { useEffect, useState } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, shadows, spacing, typography } from "@/theme";
import { ThemedText } from "../themed-text";
import type { ToastOptions } from "./types";

export interface ToastBannerProps {
  toast: ToastOptions | null;
  onDismiss: () => void;
}

/**
 * Renders an animated toast above the bottom safe-area inset, or nothing when
 * no toast is active. Dismisses the toast before invoking the optional action
 * to avoid clearing any subsequent toast spawned by that action.
 */
export function ToastBanner({ toast, onDismiss }: ToastBannerProps) {
  let insetsBottom = 0;
  try {
    const insets = useSafeAreaInsets();
    insetsBottom = insets?.bottom ?? 0;
  } catch {
    insetsBottom = 0;
  }

  const [translateY] = useState(() => new Animated.Value(spacing.lg));
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (toast) {
      translateY.setValue(spacing.lg);
      opacity.setValue(0);

      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          friction: 8,
          tension: 70,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [toast, translateY, opacity]);

  if (!toast) {
    return null;
  }

  const getBorderColor = () => {
    switch (toast.variant) {
      case "success":
        return colors.systemGreen;
      case "warning":
        return colors.systemOrange;
      case "destructive":
        return colors.systemRed;
      default:
        return colors.separator;
    }
  };

  const handleActionPress = () => {
    onDismiss();
    if (toast.action?.onPress) {
      toast.action.onPress();
    }
  };

  return (
    <Animated.View
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      testID="toast-banner"
      style={[
        styles.container,
        {
          bottom: insetsBottom + spacing.xl,
          borderColor: getBorderColor(),
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.contentRow}>
        <ThemedText
          variant="callout"
          color={colors.label}
          style={styles.messageText}
          numberOfLines={2}
        >
          {toast.message}
        </ThemedText>

        {toast.action && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              toast.action.accessibilityLabel || toast.action.label
            }
            onPress={handleActionPress}
            hitSlop={8}
            style={styles.actionButton}
          >
            <ThemedText
              variant="callout"
              color={colors.systemBlue}
              style={styles.actionLabel}
            >
              {toast.action.label}
            </ThemedText>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.secondarySystemBackground,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    boxShadow: shadows.overlay,
    zIndex: 9999,
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  messageText: {
    flex: 1,
  },
  actionButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  actionLabel: {
    fontWeight: typography.headline.fontWeight,
  },
});
