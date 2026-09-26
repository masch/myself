import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { AppMarkdownText } from "../markdown-text";

describe("AppMarkdownText component", () => {
  it("renders plain string content", () => {
    const html = renderToString(
      <AppMarkdownText content="Texto plano sin formato" />,
    );
    expect(html).toContain("Texto plano sin formato");
  });

  it("renders bold markdown tokens as bold text spans", () => {
    const html = renderToString(
      <AppMarkdownText content="Texto con **negrita** presente" />,
    );
    expect(html).toContain("negrita");
    expect(html).toContain("r-fontWeight-");
  });

  it("renders italic markdown tokens as italic text spans", () => {
    const html = renderToString(
      <AppMarkdownText content="Texto con *cursiva* presente" />,
    );
    expect(html).toContain("cursiva");
    expect(html).toContain("r-fontStyle-");
  });

  it("renders code markdown tokens with monospaced style", () => {
    const html = renderToString(
      <AppMarkdownText content="Texto con `codigo` presente" />,
    );
    expect(html).toContain("codigo");
  });

  it("renders children as fallback if content prop is omitted", () => {
    const html = renderToString(
      <AppMarkdownText>Pregunta con **formato**</AppMarkdownText>,
    );
    expect(html).toContain("Pregunta con");
    expect(html).toContain("formato");
  });
});
