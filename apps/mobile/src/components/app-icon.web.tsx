import React from "react";
import {
  Text,
  StyleSheet,
  type ColorValue,
  type StyleProp,
  type TextStyle,
} from "react-native";

export interface AppIconProps {
  name: string;
  size?: number;
  color?: ColorValue;
  style?: StyleProp<TextStyle>;
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
  "sf:text.quote": "\u201c",
  "sf:eye.fill": "👁",
  "sf:circle": "○",
  "sf:app.badge.checkmark.fill": "✓",
};

/**
 * Web fallback for SF Symbols using Unicode glyphs.
 * Rendered as a Text element since expo-image SF Symbol support requires native.
 */
export function AppIcon({ name, size = 18, color, style }: AppIconProps) {
  const glyph = SF_WEB_MAP[name] ?? (name.startsWith("sf:") ? "•" : name);

  return (
    <Text
      style={[
        styles.glyph,
        {
          fontSize: size,
          lineHeight: size + 2,
          color: color as any,
        },
        style,
      ]}
    >
      {glyph}
    </Text>
  );
}

const styles = StyleSheet.create({
  glyph: {
    textAlign: "center",
    fontWeight: "600",
  },
});
