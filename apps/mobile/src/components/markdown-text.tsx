import React, { useMemo } from "react";
import {
  Text,
  View,
  StyleSheet,
  Platform,
  type TextProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { colors, radius, spacing, typography } from "@/theme";
import { openExternalUrl } from "./open-external-url";

export interface InlineSpan {
  text: string;
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  code?: boolean;
  /** When present the span is a tappable link and `text` is its label. */
  link?: string;
}

/** `[label](https://…)` links. Explicit links are resolved after formatting. */
const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;

/** `[label](https://…)` links, or a bare `https://…` URL. A bare URL stops at a
 * NUL placeholder byte so an explicit link's placeholder is never swallowed. */
const inlineLinkRegex =
  /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s\u0000]+)/g;

/**
 * Inert stand-in for an explicit link while formatting runs. NUL bytes fence the
 * index, so no surrounding character is a word char, `http`, or a delimiter.
 */
function linkPlaceholder(index: number): string {
  return `\u0000${index}\u0000`;
}

const linkPlaceholderRegex = /\u0000(\d+)\u0000/g;

/**
 * Splits trailing punctuation out of a bare URL so the link itself stays valid.
 *
 * A closing `)` only leaves the URL when the URL contains no opening `(` at all:
 * that usually means the paren belongs to the surrounding prose, as in
 * "ver (https://example.com)", instead of to the URL. A paren the URL itself
 * opened stays part of the link.
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
    const isClosingParenWithoutMatch = lastChar === ")" && !url.includes("(");
    if (!isTrailingPunctuation && !isClosingParenWithoutMatch) break;
    trailing = lastChar + trailing;
    url = url.slice(0, -1);
  }

  return { url, trailing };
}

/**
 * Reports whether the character at `index` sits inside a bare `http(s)` URL of
 * the same whitespace-delimited token. Single-character emphasis and
 * strikethrough must stay literal there, so a URL such as
 * `https://example.com?si=_a_` or `https://example.com/~user~` keeps its
 * characters instead of turning part of the URL into a styled span.
 */
function isIndexInsideUrl(text: string, index: number): boolean {
  let tokenStart = index;
  while (tokenStart > 0 && !/\s/.test(text[tokenStart - 1])) tokenStart -= 1;
  let tokenEnd = index;
  while (tokenEnd < text.length && !/\s/.test(text[tokenEnd])) tokenEnd += 1;

  const token = text.slice(tokenStart, tokenEnd);
  const urlMatch = /https?:\/\/\S*/.exec(token);
  if (!urlMatch) return false;

  const urlStart = tokenStart + urlMatch.index;
  const urlEnd = urlStart + urlMatch[0].length;
  return index > urlStart && index < urlEnd;
}

/**
 * Reports whether a delimiter pair touches a bare `http(s)` URL. Both the
 * opening and the closing delimiter are checked, so a pair that opens outside a
 * URL but closes inside one (as in `aprox. ~10 min https://x.com/~user/`) stays
 * literal instead of cutting the URL with a styled span.
 */
function isDelimiterInsideUrl(
  text: string,
  openIndex: number,
  closeIndex: number,
): boolean {
  return (
    isIndexInsideUrl(text, openIndex) || isIndexInsideUrl(text, closeIndex)
  );
}

/**
 * Parses the formatting tokens (*italic*, **bold**, ***bold italic***, ~strikethrough~, `code`)
 * into styled spans, leaving links to the caller.
 */
function parseFormattingSpans(rawText: string): InlineSpan[] {
  const spans: InlineSpan[] = [];
  // Tokenizer regex matching bold+italic (*** or ___), bold (** or __), italic (* or _),
  // strikethrough (~ or ~~), and code (`).
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
      // *italic*: single-character emphasis must sit on a word boundary and
      // never touch a bare URL, so an underscore in "...?si=u_4PfZ_71" or
      // "...?si=_abc_" stays literal text.
      const before = matchStart === 0 ? "" : rawText[matchStart - 1];
      const afterIndex = matchStart + match[0].length;
      const after = afterIndex >= rawText.length ? "" : rawText[afterIndex];
      const delimiterLength = match[5].length;
      if (
        /\w/.test(before) ||
        /\w/.test(after) ||
        isDelimiterInsideUrl(
          rawText,
          matchStart,
          matchStart + match[0].length - delimiterLength,
        )
      ) {
        spans.push({ text: match[0] });
      } else {
        spans.push({ text: match[6], italic: true });
      }
    } else if (match[7]) {
      // ~strikethrough~: a single `~` inside a bare URL stays literal too, while
      // a doubled `~~` keeps working as a delimiter around a URL.
      if (
        match[7].length === 1 &&
        isDelimiterInsideUrl(
          rawText,
          matchStart,
          matchStart + match[0].length - match[7].length,
        )
      ) {
        spans.push({ text: match[0] });
      } else {
        spans.push({ text: match[8], strikethrough: true });
      }
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
 * Resolves `[label](url)` links and bare URLs inside a single formatting span,
 * carrying the span's bold/italic/strikethrough styling onto the link so a URL
 * wrapped in `**…**` or `~~…~~` stays a link instead of turning its markers into
 * part of the URL.
 */
function resolveLinksInText(
  text: string,
  formatting: Pick<InlineSpan, "bold" | "italic" | "strikethrough">,
): InlineSpan[] {
  const spans: InlineSpan[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  inlineLinkRegex.lastIndex = 0;

  while ((match = inlineLinkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      spans.push({
        text: text.substring(lastIndex, match.index),
        ...formatting,
      });
    }

    if (match[1] !== undefined) {
      spans.push({ text: match[1], link: match[2], ...formatting });
    } else {
      const { url, trailing } = splitTrailingPunctuation(match[3]);
      spans.push({ text: url, link: url, ...formatting });
      if (trailing.length > 0) {
        spans.push({ text: trailing, ...formatting });
      }
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    spans.push({ text: text.substring(lastIndex), ...formatting });
  }

  return spans.length > 0 ? spans : [{ text, ...formatting }];
}

/**
 * Formats the label of an explicit markdown link and attaches the link target to
 * every resulting span, so `[**bold**](url)` becomes one styled link span instead
 * of literal markers next to a link.
 */
function formatLinkLabel(label: string, url: string): InlineSpan[] {
  return coalesceSpans(parseFormattingSpans(label)).map((span) => ({
    ...span,
    link: url,
  }));
}

/** Copies a span's styling so it can be carried onto a link or split fragment. */
function formattingOf(
  span: InlineSpan,
): Pick<InlineSpan, "bold" | "italic" | "strikethrough"> {
  const formatting: Pick<InlineSpan, "bold" | "italic" | "strikethrough"> = {};
  if (span.bold) formatting.bold = true;
  if (span.italic) formatting.italic = true;
  if (span.strikethrough) formatting.strikethrough = true;
  return formatting;
}

/**
 * Turns one span's placeholders back into links, splitting the span and giving
 * each link the span's own styling. Inside `code` a placeholder becomes the
 * literal `[label](url)` text, so backticks never create a link.
 */
function substituteLinkPlaceholders(
  span: InlineSpan,
  links: readonly { raw: string; label: string; url: string }[],
): InlineSpan[] {
  if (!span.text.includes("\u0000")) return [span];

  if (span.code) {
    return [
      {
        ...span,
        text: span.text.replace(
          linkPlaceholderRegex,
          (_placeholder, index: string) => links[Number(index)].raw,
        ),
      },
    ];
  }

  const formatting = formattingOf(span);
  // A span that is itself a link must keep its target on every split fragment,
  // so extracting a placeholder never drops tappability from the rest.
  const spanLink = span.link !== undefined ? { link: span.link } : {};
  const spans: InlineSpan[] = [];
  const placeholderRegex = /\u0000(\d+)\u0000/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = placeholderRegex.exec(span.text)) !== null) {
    if (match.index > lastIndex) {
      spans.push({
        text: span.text.substring(lastIndex, match.index),
        ...formatting,
        ...spanLink,
      });
    }

    const link = links[Number(match[1])];
    for (const labelSpan of formatLinkLabel(link.label, link.url)) {
      spans.push({ ...spanLink, ...labelSpan, ...formatting });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < span.text.length) {
    spans.push({
      text: span.text.substring(lastIndex),
      ...formatting,
      ...spanLink,
    });
  }

  return spans.length > 0 ? spans : [span];
}

/**
 * Parses a segment that holds no explicit markdown links: formatting first, then
 * bare URLs inside each formatting span. `code` spans stay literal.
 */
function parseFormattingAndAutolinks(rawText: string): InlineSpan[] {
  const spans: InlineSpan[] = [];

  // Merge adjacent formatting spans first so a URL split by an intra-word
  // underscore is resolved as one link instead of three fragments.
  for (const span of coalesceSpans(parseFormattingSpans(rawText))) {
    if (span.code) {
      // A URL inside `code` is literal text, not a link.
      spans.push(span);
      continue;
    }

    const formatting: Pick<InlineSpan, "bold" | "italic" | "strikethrough"> =
      {};
    if (span.bold) formatting.bold = true;
    if (span.italic) formatting.italic = true;
    if (span.strikethrough) formatting.strikethrough = true;

    spans.push(...resolveLinksInText(span.text, formatting));
  }

  return spans.length > 0 ? spans : [{ text: rawText }];
}

/**
 * Parses inline Markdown into styled spans, resolving `[label](url)` links and bare URLs
 * into tappable `link` spans that open with `openExternalUrl`.
 *
 * Explicit `[label](url)` links are swapped for inert placeholders before the
 * formatting pipeline runs, so a delimiter pair opening before a link closes after
 * it and the whole run stays one bold/italic/code span. Each placeholder is then
 * restored as a link inheriting the enclosing span's styling, while the label keeps
 * its own formatting. Bare URLs still resolve inside each span, and a URL inside
 * backticks stays literal `code`.
 */
export function parseInlineSpans(rawText: string): InlineSpan[] {
  const links: { raw: string; label: string; url: string }[] = [];
  markdownLinkRegex.lastIndex = 0;
  const placeholderText = rawText.replace(
    markdownLinkRegex,
    (raw: string, label: string, url: string) => {
      links.push({ raw, label, url });
      return linkPlaceholder(links.length - 1);
    },
  );

  const spans: InlineSpan[] = [];

  for (const span of parseFormattingAndAutolinks(placeholderText)) {
    spans.push(...substituteLinkPlaceholders(span, links));
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
                  void openExternalUrl(span.link as string);
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
