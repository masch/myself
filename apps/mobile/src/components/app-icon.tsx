import React from "react";
import {
  Platform,
  Text,
  StyleSheet,
  type ColorValue,
  type StyleProp,
  type TextStyle,
} from "react-native";
import { Image, type ImageStyle } from "expo-image";

export interface AppIconProps {
  name: string;
  size?: number;
  color?: ColorValue;
  style?: StyleProp<ImageStyle | TextStyle>;
}

const SF_WEB_MAP: Record<string, string> = {
  "sf:pencil": "✎",
  "sf:trash": "🗑",
  "sf:plus": "+",
  "sf:plus.circle": "⊕",
  "sf:plus.circle.fill": "⊕",
  "sf:checkmark.circle": "✓",
  "sf:checkmark.circle.fill": "✓",
  "sf:checkmark.seal.fill": "✓",
  "sf:arrow.uturn.backward": "↺",
  "sf:xmark": "✕",
  "sf:person.circle.fill": "👤",
  "sf:person.fill": "👤",
  "sf:person.2.fill": "👥",
  "sf:person.badge.plus": "👤+",
  "sf:person.crop.circle.fill": "👤",
  "sf:sparkles": "✨",
  "sf:book.closed": "📖",
  "sf:book.closed.fill": "📖",
  "sf:bell.fill": "🔔",
  "sf:moon.fill": "🌙",
  "sf:clock.fill": "🕒",
  "sf:info.circle": "ℹ",
  "sf:info.circle.fill": "ℹ",
  "sf:paintbrush.fill": "🎨",
  "sf:faceid": "⚲",
  "sf:globe": "🌐",
  "sf:hand.raised.fill": "✋",
  "sf:speaker.wave.2.fill": "🔊",
  "sf:text.quote": "“",
  "sf:eye.fill": "👁",
  "sf:circle": "○",
  "sf:app.badge.checkmark.fill": "✓",
};

export function AppIcon({ name, size = 18, color, style }: AppIconProps) {
  const isWeb = Platform.OS === "web";
  const webGlyph = isWeb
    ? (SF_WEB_MAP[name] ?? (name.startsWith("sf:") ? "•" : undefined))
    : undefined;

  if (webGlyph) {
    return (
      <Text
        style={[
          styles.webGlyph,
          {
            fontSize: size,
            lineHeight: size + 2,
            color: color as any,
          },
          style as TextStyle,
        ]}
      >
        {webGlyph}
      </Text>
    );
  }

  return (
    <Image
      source={name}
      style={[
        {
          width: size,
          height: size,
          tintColor: color as any,
        },
        style as ImageStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  webGlyph: {
    textAlign: "center",
    fontWeight: "600",
  },
});
