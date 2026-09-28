import React from "react";
import {
  View,
  type ViewProps,
  type ViewStyle,
  StyleSheet,
  type StyleProp,
} from "react-native";
import { colors, radius, shadows, spacing, type SpacingKey } from "@/theme";

export type SurfaceVariant = "elevated" | "outlined" | "subdued";

export interface SurfaceProps extends ViewProps {
  variant?: SurfaceVariant;
  padding?: SpacingKey | "none";
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export function Surface({
  variant = "subdued",
  padding = "md",
  style,
  children,
  ...props
}: SurfaceProps) {
  const variantStyle = variantStyles[variant];
  const paddingValue = padding === "none" ? 0 : spacing[padding];

  if (variant === "elevated") {
    const flattened = StyleSheet.flatten(style);
    const {
      margin,
      marginHorizontal,
      marginVertical,
      marginTop,
      marginBottom,
      marginLeft,
      marginRight,
      marginStart,
      marginEnd,
      flex,
      flexGrow,
      flexShrink,
      flexBasis,
      alignSelf,
      position,
      top,
      bottom,
      left,
      right,
      start,
      end,
      zIndex,
      width,
      height,
      minWidth,
      minHeight,
      maxWidth,
      maxHeight,
      transform,
      opacity,
      ...innerStyle
    } = flattened || {};

    const outerPositioningStyle: ViewStyle = {};
    if (margin !== undefined) outerPositioningStyle.margin = margin;
    if (marginHorizontal !== undefined)
      outerPositioningStyle.marginHorizontal = marginHorizontal;
    if (marginVertical !== undefined)
      outerPositioningStyle.marginVertical = marginVertical;
    if (marginTop !== undefined) outerPositioningStyle.marginTop = marginTop;
    if (marginBottom !== undefined)
      outerPositioningStyle.marginBottom = marginBottom;
    if (marginLeft !== undefined) outerPositioningStyle.marginLeft = marginLeft;
    if (marginRight !== undefined)
      outerPositioningStyle.marginRight = marginRight;
    if (marginStart !== undefined)
      outerPositioningStyle.marginStart = marginStart;
    if (marginEnd !== undefined) outerPositioningStyle.marginEnd = marginEnd;
    if (flex !== undefined) outerPositioningStyle.flex = flex;
    if (flexGrow !== undefined) outerPositioningStyle.flexGrow = flexGrow;
    if (flexShrink !== undefined) outerPositioningStyle.flexShrink = flexShrink;
    if (flexBasis !== undefined) outerPositioningStyle.flexBasis = flexBasis;
    if (alignSelf !== undefined) outerPositioningStyle.alignSelf = alignSelf;
    if (position !== undefined) outerPositioningStyle.position = position;
    if (top !== undefined) outerPositioningStyle.top = top;
    if (bottom !== undefined) outerPositioningStyle.bottom = bottom;
    if (left !== undefined) outerPositioningStyle.left = left;
    if (right !== undefined) outerPositioningStyle.right = right;
    if (start !== undefined) outerPositioningStyle.start = start;
    if (end !== undefined) outerPositioningStyle.end = end;
    if (zIndex !== undefined) outerPositioningStyle.zIndex = zIndex;
    if (width !== undefined) outerPositioningStyle.width = width;
    if (height !== undefined) outerPositioningStyle.height = height;
    if (minWidth !== undefined) outerPositioningStyle.minWidth = minWidth;
    if (minHeight !== undefined) outerPositioningStyle.minHeight = minHeight;
    if (maxWidth !== undefined) outerPositioningStyle.maxWidth = maxWidth;
    if (maxHeight !== undefined) outerPositioningStyle.maxHeight = maxHeight;
    if (transform !== undefined) outerPositioningStyle.transform = transform;
    if (opacity !== undefined) outerPositioningStyle.opacity = opacity;

    return (
      <View
        style={[
          styles.elevatedOuter,
          variantStyle,
          outerPositioningStyle,
          innerStyle.borderRadius !== undefined
            ? { borderRadius: innerStyle.borderRadius }
            : null,
        ]}
        {...props}
      >
        <View
          style={[
            styles.elevatedInner,
            paddingValue !== undefined ? { padding: paddingValue } : null,
            innerStyle,
          ]}
        >
          {children}
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.base,
        variantStyle,
        paddingValue !== undefined ? { padding: paddingValue } : null,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

export const Card = Surface;

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  elevatedOuter: {
    borderRadius: radius.lg,
    borderCurve: "continuous",
    overflow: "visible",
  },
  elevatedInner: {
    borderRadius: radius.lg,
    borderCurve: "continuous",
    overflow: "hidden",
    flexGrow: 1,
    width: "100%",
  },
});

const variantStyles: Record<SurfaceVariant, ViewStyle> = {
  elevated: {
    backgroundColor: colors.secondarySystemBackground,
    boxShadow: shadows.card,
  },
  outlined: {
    backgroundColor: colors.systemBackground,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.separator,
  },
  subdued: {
    backgroundColor: colors.secondarySystemBackground,
  },
};
