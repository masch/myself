import React from "react";
import { type ColorValue, type StyleProp, type TextStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SF_VECTOR_MAP } from "./app-icon.constants";

export interface AppIconProps {
  name: string;
  size?: number;
  color?: ColorValue;
  style?: StyleProp<TextStyle>;
}

/**
 * Web vector AppIcon rendering crisp vector icons via @expo/vector-icons (Ionicons).
 */
export function AppIcon({ name, size = 18, color, style }: AppIconProps) {
  const vectorName = SF_VECTOR_MAP[name] ?? "help-circle-outline";

  return (
    <Ionicons
      name={vectorName}
      size={size}
      color={color ? String(color) : undefined}
      style={style}
    />
  );
}
