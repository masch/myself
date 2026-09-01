import React, { useMemo } from "react";
import {
  ColorValue,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { colors } from "@/theme/colors";

export interface MeditationTextProps {
  content: string;
  style?: TextStyle;
  containerStyle?: ViewStyle;
  baseFontSize?: number;
  baseLineHeight?: number;
  textColor?: ColorValue;
  accentColor?: ColorValue;
}

interface InlineSpan {
  text: string;
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
}

interface VerseLine {
  type: "verse" | "quote" | "empty";
  indentSpaces: number;
  spans: InlineSpan[];
}

interface StanzaBlock {
  lines: VerseLine[];
}

/**
 * Parses inline Markdown tokens (*italic*, **bold**, ***bold italic***, ~strikethrough~)
 * into a structured list of styled spans.
 */
export function parseInlineSpans(rawText: string): InlineSpan[] {
  const spans: InlineSpan[] = [];
  // Tokenizer regex matching bold+italic (*** or ___), bold (** or __), italic (* or _), and strikethrough (~ or ~~)
  const tokenRegex =
    /(\*\*\*|___)(.*?)\1|(\*\*|__)(.*?)\3|(\*|_)(.*?)\5|(~~|~)(.*?)\7/g;

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
    }

    lastIndex = matchStart + match[0].length;
  }

  if (lastIndex < rawText.length) {
    spans.push({ text: rawText.substring(lastIndex) });
  }

  return spans.length > 0 ? spans : [{ text: rawText }];
}

/**
 * Parses raw meditation text into structured Stanzas and Verses,
 * capturing non-linear leading indentation and blockquote markers.
 */
export function parseMeditationText(content: string): StanzaBlock[] {
  if (!content || !content.trim()) {
    return [];
  }

  // Normalize line breaks
  const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rawStanzas = normalized.split(/\n{2,}/);

  return rawStanzas.map((rawStanza) => {
    const lines = rawStanza.split("\n").map((rawLine): VerseLine => {
      if (!rawLine.trim()) {
        return { type: "empty", indentSpaces: 0, spans: [{ text: "" }] };
      }

      let lineText = rawLine;
      let isQuote = false;

      // Check for blockquote prefix ('>')
      const trimmedLeft = lineText.trimStart();
      if (trimmedLeft.startsWith(">")) {
        isQuote = true;
        lineText = trimmedLeft.replace(/^>\s?/, "");
      }

      // Calculate leading spaces for non-linear indentation
      const matchLeadingSpaces = lineText.match(/^(\s+)/);
      const leadingSpaces = matchLeadingSpaces
        ? matchLeadingSpaces[1].length
        : 0;
      const contentText = isQuote ? lineText : lineText.trimStart();

      return {
        type: isQuote ? "quote" : "verse",
        indentSpaces: isQuote ? 0 : leadingSpaces,
        spans: parseInlineSpans(contentText),
      };
    });

    return { lines };
  });
}

/**
 * Native Meditation & Reflective Text Renderer
 * Renders Markdown-structured verses, stanzas, and non-linear spacing
 * directly into native Text/View hierarchies without WebViews.
 */
export function MeditationText({
  content,
  style,
  containerStyle,
  baseFontSize = 15,
  baseLineHeight = 23,
  textColor,
  accentColor = colors.systemPurple,
}: MeditationTextProps) {
  const stanzas = useMemo(() => parseMeditationText(content), [content]);

  if (stanzas.length === 0) {
    return null;
  }

  const defaultColor = textColor || colors.label;
  const indentStep = 10; // Pixels per leading space level (2 spaces = ~20px)

  return (
    <View style={[styles.container, containerStyle]}>
      {stanzas.map((stanza, stanzaIdx) => (
        <View
          key={`stanza-${stanzaIdx}`}
          style={[styles.stanza, stanzaIdx > 0 && styles.stanzaSpacing]}
        >
          {stanza.lines.map((line, lineIdx) => {
            if (line.type === "empty") {
              return (
                <View
                  key={`line-${stanzaIdx}-${lineIdx}`}
                  style={{ height: baseLineHeight * 0.5 }}
                />
              );
            }

            if (line.type === "quote") {
              return (
                <View
                  key={`line-${stanzaIdx}-${lineIdx}`}
                  style={[
                    styles.quoteContainer,
                    { borderLeftColor: accentColor },
                  ]}
                >
                  <Text
                    style={[
                      styles.baseText,
                      {
                        fontSize: baseFontSize,
                        lineHeight: baseLineHeight,
                        color: defaultColor,
                        fontStyle: "italic",
                      },
                      style,
                    ]}
                  >
                    {line.spans.map((span, spanIdx) => (
                      <Text
                        key={`span-${stanzaIdx}-${lineIdx}-${spanIdx}`}
                        style={[
                          span.bold && styles.bold,
                          span.italic && styles.italic,
                          span.strikethrough && styles.strikethrough,
                        ]}
                      >
                        {span.text}
                      </Text>
                    ))}
                  </Text>
                </View>
              );
            }

            const indentPadding = Math.min(
              line.indentSpaces * (indentStep / 2),
              120,
            );

            return (
              <View
                key={`line-${stanzaIdx}-${lineIdx}`}
                style={[
                  styles.verseLine,
                  indentPadding > 0 && { paddingLeft: indentPadding },
                ]}
              >
                <Text
                  style={[
                    styles.baseText,
                    {
                      fontSize: baseFontSize,
                      lineHeight: baseLineHeight,
                      color: defaultColor,
                    },
                    style,
                  ]}
                >
                  {line.spans.map((span, spanIdx) => (
                    <Text
                      key={`span-${stanzaIdx}-${lineIdx}-${spanIdx}`}
                      style={[
                        span.bold && styles.bold,
                        span.italic && styles.italic,
                        span.strikethrough && styles.strikethrough,
                      ]}
                    >
                      {span.text}
                    </Text>
                  ))}
                </Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  stanza: {
    width: "100%",
  },
  stanzaSpacing: {
    marginTop: 14,
  },
  verseLine: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: "100%",
  },
  quoteContainer: {
    borderLeftWidth: 3,
    paddingLeft: 12,
    marginVertical: 4,
    width: "100%",
  },
  baseText: {
    letterSpacing: 0.2,
  },
  bold: {
    fontWeight: "700",
  },
  italic: {
    fontStyle: "italic",
  },
  strikethrough: {
    textDecorationLine: "line-through",
  },
});
