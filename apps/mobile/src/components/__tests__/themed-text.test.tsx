import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { ThemedText } from "../themed-text";

describe("ThemedText component", () => {
  it("renders text content with default body variant", () => {
    const html = renderToString(<ThemedText>Default Body Text</ThemedText>);
    expect(html).toContain("Default Body Text");
  });

  it("renders with largeTitle variant", () => {
    const html = renderToString(
      <ThemedText variant="largeTitle">Main Page Title</ThemedText>,
    );
    expect(html).toContain("Main Page Title");
  });

  it("renders with headline variant", () => {
    const html = renderToString(
      <ThemedText variant="headline">Section Header</ThemedText>,
    );
    expect(html).toContain("Section Header");
  });

  it("renders with caption1 and caption2 variants", () => {
    const html1 = renderToString(
      <ThemedText variant="caption1">Footnote 1</ThemedText>,
    );
    const html2 = renderToString(
      <ThemedText variant="caption2">Footnote 2</ThemedText>,
    );
    expect(html1).toContain("Footnote 1");
    expect(html2).toContain("Footnote 2");
  });

  it("supports color prop override", () => {
    const html = renderToString(
      <ThemedText color="#FF3B30">Warning Text</ThemedText>,
    );
    expect(html).toContain("Warning Text");
  });

  it("merges custom style overrides last", () => {
    const html = renderToString(
      <ThemedText style={{ textAlign: "center" }}>Centered</ThemedText>,
    );
    expect(html).toContain("Centered");
  });
});
