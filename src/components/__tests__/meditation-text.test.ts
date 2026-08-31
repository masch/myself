import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  parseInlineSpans,
  parseMeditationText,
  MeditationText,
} from "../meditation-text";

describe("parseInlineSpans", () => {
  it("parses plain text without tokens", () => {
    const spans = parseInlineSpans("Texto simple sin formato");
    expect(spans).toEqual([{ text: "Texto simple sin formato" }]);
  });

  it("parses bold tokens (** and __)", () => {
    const spansStar = parseInlineSpans("Palabra en **negrita** aqui");
    expect(spansStar).toEqual([
      { text: "Palabra en " },
      { text: "negrita", bold: true },
      { text: " aqui" },
    ]);

    const spansUnderscore = parseInlineSpans("Palabra en __negrita__ aqui");
    expect(spansUnderscore).toEqual([
      { text: "Palabra en " },
      { text: "negrita", bold: true },
      { text: " aqui" },
    ]);
  });

  it("parses italic tokens (* and _)", () => {
    const spansStar = parseInlineSpans("Palabra en *cursiva* aqui");
    expect(spansStar).toEqual([
      { text: "Palabra en " },
      { text: "cursiva", italic: true },
      { text: " aqui" },
    ]);

    const spansUnderscore = parseInlineSpans("Palabra en _cursiva_ aqui");
    expect(spansUnderscore).toEqual([
      { text: "Palabra en " },
      { text: "cursiva", italic: true },
      { text: " aqui" },
    ]);
  });

  it("parses bold and italic tokens (***)", () => {
    const spans = parseInlineSpans("Texto ***muy destacado*** final");
    expect(spans).toEqual([
      { text: "Texto " },
      { text: "muy destacado", bold: true, italic: true },
      { text: " final" },
    ]);
  });

  it("parses strikethrough tokens (~)", () => {
    const spans = parseInlineSpans("Texto ~tachado~ final");
    expect(spans).toEqual([
      { text: "Texto " },
      { text: "tachado", strikethrough: true },
      { text: " final" },
    ]);
  });
});

describe("parseMeditationText", () => {
  it("returns empty array for empty or whitespace content", () => {
    expect(parseMeditationText("")).toEqual([]);
    expect(parseMeditationText("   ")).toEqual([]);
  });

  it("parses verses, stanzas, and non-linear indentation", () => {
    const poem = `Primer verso
  Segundo verso con sangria
    Tercer verso profundo

Segunda estrofa
> Verso en bloque`;

    const stanzas = parseMeditationText(poem);
    expect(stanzas.length).toBe(2);

    // Stanza 1
    expect(stanzas[0].lines.length).toBe(3);
    expect(stanzas[0].lines[0].indentSpaces).toBe(0);
    expect(stanzas[0].lines[1].indentSpaces).toBe(2);
    expect(stanzas[0].lines[2].indentSpaces).toBe(4);

    // Stanza 2
    expect(stanzas[1].lines.length).toBe(2);
    expect(stanzas[1].lines[1].type).toBe("quote");
  });

  it("handles empty lines within a stanza", () => {
    const text = "Linea 1\n  \nLinea 2";
    const stanzas = parseMeditationText(text);
    expect(stanzas.length).toBe(1);
    expect(stanzas[0].lines[1].type).toBe("empty");
  });
});

describe("MeditationText Component", () => {
  it("renders null for empty text", () => {
    const html = renderToString(
      React.createElement(MeditationText, { content: "" }),
    );
    expect(html).toBe("");
  });

  it("renders formatted poem into HTML elements", () => {
    const poem = `*Silencio no es la ausencia de sonido,*
  sino la presencia
    de una quietud
      más profunda que las palabras.

> Respira el espacio entre tus pensamientos.`;

    const html = renderToString(
      React.createElement(MeditationText, {
        content: poem,
        baseFontSize: 16,
      }),
    );

    expect(html).toContain("Silencio no es la ausencia de sonido");
    expect(html).toContain("sino la presencia");
    expect(html).toContain("Respira el espacio entre tus pensamientos");
  });

  it("renders empty lines with spacer element", () => {
    const poem = "Verso 1\n  \nVerso 2";
    const html = renderToString(
      React.createElement(MeditationText, { content: poem }),
    );
    expect(html).toContain("Verso 1");
    expect(html).toContain("Verso 2");
  });
});
