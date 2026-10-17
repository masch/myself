import React, { useMemo } from "react";
import {
  Text,
  View,
  StyleSheet,
  Platform,
  Linking,
  type TextProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { colors, radius, spacing, typography } from "@/theme";

export interface InlineSpan {
  text: string;
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  code?: boolean;
  /** When present the span is a tappable link and `text` is its label. */
  link?: string;
}

/** `[label](https://…)` links, or a bare `https://…` URL. */
const inlineLinkRegex =
  /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/\S+)/g;

/**
 * Splits trailing punctuation out of a bare URL so the link itself stays valid.
 */
function splitTrailingPunctuation(rawUrl: string): {
  url: string;
  trailing: string;
} {
  let url = rawUrl;
  let trailing = "";

  while (url.length > 0) {
    const lastChar = url[url.length - 1];
    const isTrailingPunctuation = ".,;:!?".includes(lastChar);
    const isUnbalancedParen = lastChar === ")" && !url.includes("(");
    if (!isTrailingPunctuation && !isUnbalancedParen) break;
    trailing = lastChar + trailing;
    url = url.slice(0, -1);
  }

  return { url, trailing };
}

/**
 * Parses the formatting tokens (*italic*, **bold**, ***bold italic***, ~strikethrough~, `code`)
 * into styled spans, leaving links to the caller.
 */
function parseFormattingSpans(rawText: string): InlineSpan[] {
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

/**
 * Merges adjacent spans that share styling and link target, so autolink handling
 * does not split plain text into several text nodes.
 */
function coalesceSpans(spans: InlineSpan[]): InlineSpan[] {
  const merged: InlineSpan[] = [];

  for (const span of spans) {
    const previous = merged[merged.length - 1];
    const isSameStyle =
      previous !== undefined &&
      previous.bold === span.bold &&
      previous.italic === span.italic &&
      previous.strikethrough === span.strikethrough &&
      previous.code === span.code &&
      previous.link === span.link;

    if (isSameStyle) {
      previous.text += span.text;
    } else {
      merged.push({ ...span });
    }
  }

  return merged;
}

/**
 * Parses inline Markdown into styled spans, resolving `[label](url)` links and bare URLs
 * into tappable `link` spans that open with `Linking.openURL`.
 *
 * Links are resolved before formatting, so emphasis markers wrapping a whole link
 * stay literal instead of hiding it.
 */
export function parseInlineSpans(rawText: string): InlineSpan[] {
  const spans: InlineSpan[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  inlineLinkRegex.lastIndex = 0;

  while ((match = inlineLinkRegex.exec(rawText)) !== null) {
    if (match.index > lastIndex) {
      spans.push(
        ...parseFormattingSpans(rawText.substring(lastIndex, match.index)),
      );
    }

    if (match[1] !== undefined) {
      spans.push({ text: match[1], link: match[2] });
    } else {
      const { url, trailing } = splitTrailingPunctuation(match[3]);
      spans.push({ text: url, link: url });
      if (trailing.length > 0) {
        spans.push({ text: trailing });
      }
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < rawText.length) {
    spans.push(...parseFormattingSpans(rawText.substring(lastIndex)));
  }

  return spans.length > 0 ? coalesceSpans(spans) : [{ text: rawText }];
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
          accessibilityRole={span.link ? "link" : undefined}
          onPress={
            span.link
              ? () => {
                  void Linking.openURL(span.link as string);
                }
              : undefined
          }
          style={[
            span.bold && [styles.bold, boldStyle],
            span.italic && [styles.italic, italicStyle],
            span.strikethrough && styles.strikethrough,
            span.code && [styles.code, codeStyle],
            span.link && styles.link,
          ]}
        >
          {span.text}
        </Text>
      ))}
    </Text>
  );
}

export type MarkdownBlock =
  | { type: "heading"; level: 1 | 2 | 3 | 4 | 5 | 6; text: string }
  | { type: "blockquote"; text: string }
  | { type: "unordered-list-item"; text: string }
  | { type: "ordered-list-item"; index: number; text: string }
  | { type: "paragraph"; text: string };

/**
 * Parses multi-line markdown text into structured document blocks:
 * headings (#, ##, ###), blockquotes (>), lists (*, -, 1.), and paragraphs.
 */
export function parseMarkdownBlocks(rawText: string): MarkdownBlock[] {
  const lines = rawText.split(/\r?\n/);
  const blocks: MarkdownBlock[] = [];
  let currentBlock: MarkdownBlock | null = null;

  const flushCurrentBlock = () => {
    if (currentBlock) {
      blocks.push(currentBlock);
      currentBlock = null;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushCurrentBlock();
      continue;
    }

    // Heading (# H1, ## H2, etc.)
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushCurrentBlock();
      blocks.push({
        type: "heading",
        level: headingMatch[1].length as 1 | 2 | 3 | 4 | 5 | 6,
        text: headingMatch[2],
      });
      continue;
    }

    // Blockquote (> Quote)
    const quoteMatch = trimmed.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      const quoteText = quoteMatch[1];
      if (currentBlock && currentBlock.type === "blockquote") {
        currentBlock.text += "\n" + quoteText;
      } else {
        flushCurrentBlock();
        currentBlock = { type: "blockquote", text: quoteText };
      }
      continue;
    }

    // Unordered list item (* Item, - Item, + Item)
    const bulletMatch = trimmed.match(/^[*+-]\s+(.*)$/);
    if (bulletMatch) {
      flushCurrentBlock();
      blocks.push({
        type: "unordered-list-item",
        text: bulletMatch[1],
      });
      continue;
    }

    // Ordered list item (1. Item, 2. Item)
    const orderedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (orderedMatch) {
      flushCurrentBlock();
      blocks.push({
        type: "ordered-list-item",
        index: parseInt(orderedMatch[1], 10),
        text: orderedMatch[2],
      });
      continue;
    }

    // Paragraph (accumulate multi-line paragraph)
    if (currentBlock && currentBlock.type === "paragraph") {
      currentBlock.text += "\n" + trimmed;
    } else {
      flushCurrentBlock();
      currentBlock = { type: "paragraph", text: trimmed };
    }
  }

  flushCurrentBlock();
  return blocks;
}

export interface AppMarkdownProps {
  content?: string;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  paragraphStyle?: StyleProp<TextStyle>;
  blockquoteStyle?: StyleProp<ViewStyle>;
  blockquoteTextStyle?: StyleProp<TextStyle>;
  listItemStyle?: StyleProp<TextStyle>;
}

/**
 * Block-level Markdown document renderer that structures headings, blockquotes,
 * bullet/ordered lists, and paragraphs, rendering inline text via AppMarkdownText.
 */
export function AppMarkdown({
  content,
  children,
  style,
  paragraphStyle,
  blockquoteStyle,
  blockquoteTextStyle,
  listItemStyle,
}: AppMarkdownProps) {
  const rawText =
    typeof content === "string"
      ? content
      : typeof children === "string"
        ? children
        : "";

  const blocks: MarkdownBlock[] = useMemo(
    () => (rawText ? parseMarkdownBlocks(rawText) : []),
    [rawText],
  );

  if (!rawText) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      {blocks.map((block, index) => {
        switch (block.type) {
          case "heading": {
            const headingStyle =
              block.level === 1
                ? styles.h1
                : block.level === 2
                  ? styles.h2
                  : block.level === 3
                    ? styles.h3
                    : styles.h4;
            return (
              <AppMarkdownText key={index} style={headingStyle}>
                {block.text}
              </AppMarkdownText>
            );
          }
          case "blockquote":
            return (
              <View key={index} style={[styles.blockquote, blockquoteStyle]}>
                <AppMarkdownText
                  style={[styles.blockquoteText, blockquoteTextStyle]}
                  italicStyle={styles.italic}
                >
                  {block.text}
                </AppMarkdownText>
              </View>
            );
          case "unordered-list-item":
            return (
              <View key={index} style={styles.listItemRow}>
                <Text style={styles.bulletMarker}>•</Text>
                <AppMarkdownText
                  style={[styles.listItemContent, listItemStyle]}
                >
                  {block.text}
                </AppMarkdownText>
              </View>
            );
          case "ordered-list-item":
            return (
              <View key={index} style={styles.listItemRow}>
                <Text style={styles.orderedMarker}>{block.index}.</Text>
                <AppMarkdownText
                  style={[styles.listItemContent, listItemStyle]}
                >
                  {block.text}
                </AppMarkdownText>
              </View>
            );
          case "paragraph":
            return (
              <AppMarkdownText
                key={index}
                style={[styles.paragraph, paragraphStyle]}
              >
                {block.text}
              </AppMarkdownText>
            );
        }
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  paragraph: {
    ...typography.callout,
    color: colors.label,
    marginVertical: spacing.xs,
  },
  h1: {
    ...typography.title2,
    color: colors.label,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  h2: {
    ...typography.headline,
    fontSize: 19,
    lineHeight: 25,
    color: colors.label,
    marginTop: spacing.compact,
    marginBottom: spacing.xs + 2,
  },
  h3: {
    ...typography.headline,
    fontSize: 16,
    color: colors.label,
    marginTop: spacing.compact,
    marginBottom: spacing.xs,
  },
  h4: {
    ...typography.callout,
    fontWeight: "600",
    color: colors.label,
    marginTop: spacing.sm + 2,
    marginBottom: spacing.xs,
  },
  link: {
    color: colors.systemBlue,
    textDecorationLine: "underline",
  },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: colors.systemBlue,
    paddingLeft: spacing.compact,
    paddingVertical: 6,
    marginVertical: spacing.sm,
    backgroundColor: colors.systemGray15,
    borderRadius: radius.sm / 2,
  },
  blockquoteText: {
    ...typography.caption1,
    fontSize: 14,
    lineHeight: 21,
    color: colors.secondaryLabel,
    fontStyle: "italic",
  },
  listItemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginVertical: 3,
  },
  bulletMarker: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.systemBlue,
    marginRight: spacing.sm,
    width: 14,
    textAlign: "center",
  },
  orderedMarker: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.secondaryLabel,
    marginRight: spacing.sm,
    minWidth: 18,
    textAlign: "right",
  },
  listItemContent: {
    flex: 1,
    ...typography.callout,
    color: colors.label,
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
