import React, { useMemo } from "react";
import {
  Text,
  StyleSheet,
  Platform,
  type TextProps,
  type StyleProp,
  type TextStyle,
} from "react-native";
import { colors } from "@/theme/colors";

export interface InlineSpan {
  text: string;
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  code?: boolean;
}

/**
 * Parses inline Markdown tokens (*italic*, **bold**, ***bold italic***, ~strikethrough~, `code`)
 * into a structured list of styled spans.
 */
export function parseInlineSpans(rawText: string): InlineSpan[] {
  const spans: InlineSpan[] = [];
  // Tokenizer regex matching bold+italic (*** or ___), bold (** or __), italic (* or _), strikethrough (~ or ~~), and code (`)
  const tokenRegex =
    /(\*\*\*|___)(.*?)\1|(\*\*|__)(.*?)\3|(\*|_)(.*?)\5|(~~|~)(.*?)\7|(`)(.*?)\9/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(rawText)) !== null) {
    const matchStart = match.index;
    if (matchStart > lastIndex) {
      spans.push({ text: rawText.substring(lastIndex, matchStart) });
    }

    if (match[1]) {
      // ***bold italic***
      spans.push({ text: match[2], bold: true, italic: true });
    } else if (match[3]) {
      // **bold**
      spans.push({ text: match[4], bold: true });
    } else if (match[5]) {
      // *italic*
      spans.push({ text: match[6], italic: true });
    } else if (match[7]) {
      // ~strikethrough~
      spans.push({ text: match[8], strikethrough: true });
    } else if (match[9]) {
      // `code`
      spans.push({ text: match[10], code: true });
    }

    lastIndex = matchStart + match[0].length;
  }

  if (lastIndex < rawText.length) {
    spans.push({ text: rawText.substring(lastIndex) });
  }

  return spans.length > 0 ? spans : [{ text: rawText }];
}

export interface AppMarkdownTextProps extends TextProps {
  content?: string;
  children?: React.ReactNode;
  codeStyle?: StyleProp<TextStyle>;
  boldStyle?: StyleProp<TextStyle>;
  italicStyle?: StyleProp<TextStyle>;
}

/**
 * Reusable Markdown text renderer supporting inline *italic*, **bold**, ***bold italic***,
 * ~strikethrough~, and `code` spans seamlessly with line-wrapping and numberOfLines.
 */
export function AppMarkdownText({
  content,
  children,
  style,
  codeStyle,
  boldStyle,
  italicStyle,
  ...props
}: AppMarkdownTextProps) {
  const rawText =
    typeof content === "string"
      ? content
      : typeof children === "string"
        ? children
        : "";

  const spans: InlineSpan[] = useMemo(
    () => (rawText ? parseInlineSpans(rawText) : []),
    [rawText],
  );

  if (!rawText) {
    return (
      <Text style={style} {...props}>
        {children}
      </Text>
    );
  }

  return (
    <Text style={style} {...props}>
      {spans.map((span, index) => (
        <Text
          key={index}
          style={[
            span.bold && [styles.bold, boldStyle],
            span.italic && [styles.italic, italicStyle],
            span.strikethrough && styles.strikethrough,
            span.code && [styles.code, codeStyle],
          ]}
        >
          {span.text}
        </Text>
      ))}
    </Text>
  );
}

const styles = StyleSheet.create({
  bold: {
    fontWeight: "700",
  },
  italic: {
    fontStyle: "italic",
  },
  strikethrough: {
    textDecorationLine: "line-through",
  },
  code: {
    fontFamily: Platform.select({
      ios: "Menlo",
      android: "monospace",
      default: "monospace",
    }),
    backgroundColor: colors.systemGray15,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
});
