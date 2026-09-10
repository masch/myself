import React from "react";
import { type ColorValue, type StyleProp } from "react-native";
import { Image, type ImageStyle } from "expo-image";

export interface AppIconProps {
  name: string;
  size?: number;
  color?: ColorValue;
  style?: StyleProp<ImageStyle>;
}

/**
 * Native AppIcon rendering SF Symbols via expo-image.
 * On web, Metro resolves app-icon.web.tsx instead.
 */
export function AppIcon({ name, size = 18, color, style }: AppIconProps) {
  return (
    <Image
      source={name}
      style={[
        {
          width: size,
          height: size,
          tintColor: color as any,
        },
        style,
      ]}
    />
  );
}
