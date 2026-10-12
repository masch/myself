import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  AppMarkdownText,
  AppMarkdown,
  parseMarkdownBlocks,
} from "../markdown-text";

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

describe("AppMarkdown block component and parser", () => {
  it("parses multi-line markdown into structured blocks", () => {
    const markdown = `> "Cita importante" — Autor

### Titulo de seccion
Parrafo explicativo aqui.

* **Primer punto** clave
* Segundo punto
1. Paso numerado`;

    const blocks = parseMarkdownBlocks(markdown);
    expect(blocks.length).toBe(6);
    expect(blocks[0].type).toBe("blockquote");
    expect(blocks[0].text).toBe('"Cita importante" — Autor');

    expect(blocks[1].type).toBe("heading");
    if (blocks[1].type === "heading") {
      expect(blocks[1].level).toBe(3);
      expect(blocks[1].text).toBe("Titulo de seccion");
    }

    expect(blocks[2].type).toBe("paragraph");
    expect(blocks[2].text).toBe("Parrafo explicativo aqui.");

    expect(blocks[3].type).toBe("unordered-list-item");
    expect(blocks[3].text).toBe("**Primer punto** clave");

    expect(blocks[4].type).toBe("unordered-list-item");
    expect(blocks[4].text).toBe("Segundo punto");

    expect(blocks[5].type).toBe("ordered-list-item");
    if (blocks[5].type === "ordered-list-item") {
      expect(blocks[5].index).toBe(1);
      expect(blocks[5].text).toBe("Paso numerado");
    }
  });

  it("renders AppMarkdown with quote, headings, and bullet points", () => {
    const markdown = `> "La tranquilidad comienza cuando distingues lo que depende de ti." — Epicteto

### Ejercicio Practico
Durante el dia hace una pausa.

* **"¿Esto depende de mi o no?"**
* Si no depende de vos, solta la tension.`;

    const html = renderToString(<AppMarkdown content={markdown} />);
    expect(html).toContain("La tranquilidad comienza");
    expect(html).toContain("Ejercicio Practico");
    expect(html).toContain("Durante el dia");
    expect(html).toContain("•");
    expect(html).toContain("¿Esto depende de mi o no?");
  });
});
