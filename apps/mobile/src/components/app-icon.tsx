import React from "react";
import {
  Platform,
  type ColorValue,
  type StyleProp,
  type TextStyle,
  type ImageStyle,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { SF_VECTOR_MAP } from "./app-icon.constants";

export interface AppIconProps {
  name: string;
  size?: number;
  color?: ColorValue;
  style?: StyleProp<TextStyle | ImageStyle>;
}

/**
 * Cross-platform vector AppIcon component.
 * - On iOS: Renders native Apple SF Symbols via expo-image.
 * - On Android & Web: Renders native vector iconography via @expo/vector-icons (Ionicons).
 */
export function AppIcon({ name, size = 18, color, style }: AppIconProps) {
  if (Platform.OS === "ios" && name.startsWith("sf:")) {
    return (
      <Image
        source={name}
        tintColor={color ? String(color) : undefined}
        style={[
          {
            width: size,
            height: size,
          },
          style as StyleProp<ImageStyle>,
        ]}
      />
    );
  }

  const vectorName = SF_VECTOR_MAP[name] ?? "help-circle-outline";

  return (
    <Ionicons
      name={vectorName}
      size={size}
      color={color ? String(color) : undefined}
      style={style as StyleProp<TextStyle>}
    />
  );
}
