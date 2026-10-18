import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  AppMarkdownText,
  AppMarkdown,
  parseMarkdownBlocks,
  parseInlineSpans,
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

describe("AppMarkdownText links", () => {
  it("parses a markdown link into a link span with its label", () => {
    const spans = parseInlineSpans(
      "Mirá [la meditación](https://youtu.be/az1IKPZ7N2U) completa",
    );
    expect(spans).toEqual([
      { text: "Mirá " },
      { text: "la meditación", link: "https://youtu.be/az1IKPZ7N2U" },
      { text: " completa" },
    ]);
  });

  it("autolinks a bare url and keeps trailing punctuation outside the link", () => {
    const spans = parseInlineSpans(
      "Audio: https://drive.google.com/file/d/1NxOoDh5qsFl5/view?usp=sharing, después seguimos",
    );
    expect(spans).toEqual([
      { text: "Audio: " },
      {
        text: "https://drive.google.com/file/d/1NxOoDh5qsFl5/view?usp=sharing",
        link: "https://drive.google.com/file/d/1NxOoDh5qsFl5/view?usp=sharing",
      },
      { text: ", después seguimos" },
    ]);
  });

  it("keeps the surrounding formatting tokens working around a link", () => {
    const spans = parseInlineSpans("**Ver** [video](https://youtu.be/abc)");
    expect(spans).toEqual([
      { text: "Ver", bold: true },
      { text: " " },
      { text: "video", link: "https://youtu.be/abc" },
    ]);
  });

  it("does not autolink text without a url scheme", () => {
    const spans = parseInlineSpans("Dominio suelto drive.google.com/file");
    expect(spans).toEqual([{ text: "Dominio suelto drive.google.com/file" }]);
  });

  it("renders a link span with the link accessibility role and its label", () => {
    const html = renderToString(
      <AppMarkdownText content="Meditación: [Ver video](https://youtu.be/abc)" />,
    );
    expect(html).toContain("Ver video");
    expect(html).toContain('role="link"');
  });

  it("keeps a backtick-quoted url as a single code span without a link", () => {
    const spans = parseInlineSpans("Código `https://example.com` aqui");
    expect(spans).toEqual([
      { text: "Código " },
      { text: "https://example.com", code: true },
      { text: " aqui" },
    ]);
  });

  it("autolinks a url wrapped in bold without including the bold markers", () => {
    const spans = parseInlineSpans("**https://example.com**");
    expect(spans).toEqual([
      {
        text: "https://example.com",
        bold: true,
        link: "https://example.com",
      },
    ]);
  });

  it("autolinks a url wrapped in strikethrough without including the markers", () => {
    const spans = parseInlineSpans("~~https://example.com~~");
    expect(spans).toEqual([
      {
        text: "https://example.com",
        strikethrough: true,
        link: "https://example.com",
      },
    ]);
  });

  it("still autolinks a plain bare url", () => {
    const spans = parseInlineSpans("Ver https://example.com para más");
    expect(spans).toEqual([
      { text: "Ver " },
      { text: "https://example.com", link: "https://example.com" },
      { text: " para más" },
    ]);
  });

  it("keeps a bare url with underscores intact as a single link span", () => {
    const url = "https://youtu.be/uqN5Z9tsacg?si=u_4PfZ_71SlJni8r";
    const spans = parseInlineSpans(`Video: ${url}`);
    expect(spans).toEqual([{ text: "Video: " }, { text: url, link: url }]);
  });

  it("drops the closing paren when the bare url sits inside prose parentheses", () => {
    const spans = parseInlineSpans("Ver (https://example.com)");
    expect(spans).toEqual([
      { text: "Ver (" },
      { text: "https://example.com", link: "https://example.com" },
      { text: ")" },
    ]);
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

describe("markdown link labels with inline formatting (regression)", () => {
  it("keeps a bold-formatted link label as a single link span", () => {
    expect(parseInlineSpans("[**bold**](https://example.com)")).toEqual([
      { text: "bold", bold: true, link: "https://example.com" },
    ]);
  });
  it("keeps a strikethrough-formatted link label as a single link span", () => {
    expect(parseInlineSpans("[~~old~~](https://example.com)")).toEqual([
      { text: "old", strikethrough: true, link: "https://example.com" },
    ]);
  });
  it("keeps a code-formatted link label as a single link span", () => {
    expect(parseInlineSpans("[`code`](https://example.com)")).toEqual([
      { text: "code", code: true, link: "https://example.com" },
    ]);
  });
  it("keeps a mixed-formatting link label linked across its styled spans", () => {
    expect(parseInlineSpans("[a *b* c](https://example.com)")).toEqual([
      { text: "a ", link: "https://example.com" },
      { text: "b", italic: true, link: "https://example.com" },
      { text: " c", link: "https://example.com" },
    ]);
  });
});

describe("backtick-quoted template urls stay code (S2)", () => {
  it("keeps an underscore-bearing url in backticks as a single code span", () => {
    const spans = parseInlineSpans(
      "Ver `https://youtu.be/uqN5Z9tsacg?si=u_4PfZ_71SlJni8r` fin",
    );
    expect(spans).toEqual([
      { text: "Ver " },
      { text: "https://youtu.be/uqN5Z9tsacg?si=u_4PfZ_71SlJni8r", code: true },
      { text: " fin" },
    ]);
  });
});

describe("bare urls whose delimiter chars are not word-adjacent stay whole links", () => {
  it("keeps an underscore pair between non-word characters inside the url", () => {
    const spans = parseInlineSpans("Ver https://example.com?si=_abc_ fin");
    expect(spans).toEqual([
      { text: "Ver " },
      {
        text: "https://example.com?si=_abc_",
        link: "https://example.com?si=_abc_",
      },
      { text: " fin" },
    ]);
  });

  it("keeps an underscore path segment inside the url", () => {
    const spans = parseInlineSpans("Ver https://example.com/_a_/b fin");
    expect(spans).toEqual([
      { text: "Ver " },
      { text: "https://example.com/_a_/b", link: "https://example.com/_a_/b" },
      { text: " fin" },
    ]);
  });

  it("keeps a single tilde path segment inside the url", () => {
    const spans = parseInlineSpans("Ver https://example.com/~user~ fin");
    expect(spans).toEqual([
      { text: "Ver " },
      {
        text: "https://example.com/~user~",
        link: "https://example.com/~user~",
      },
      { text: " fin" },
    ]);
  });
});

describe("a delimiter pair is literal when either delimiter is inside a url", () => {
  it("keeps a single tilde that opens outside a url but closes inside it from cutting the link", () => {
    const spans = parseInlineSpans("aprox. ~10 min https://x.com/~user/");
    expect(spans).toEqual([
      { text: "aprox. ~10 min " },
      { text: "https://x.com/~user/", link: "https://x.com/~user/" },
    ]);
  });

  it("keeps a single asterisk that opens outside a url but closes inside it from cutting the link", () => {
    const spans = parseInlineSpans("x *y https://x.com/a*/b");
    expect(spans).toEqual([
      { text: "x *y " },
      { text: "https://x.com/a*/b", link: "https://x.com/a*/b" },
    ]);
  });

  it("keeps a single underscore that opens outside a url but closes inside it from cutting the link", () => {
    const spans = parseInlineSpans("x _y https://x.com/a_/b");
    expect(spans).toEqual([
      { text: "x _y " },
      { text: "https://x.com/a_/b", link: "https://x.com/a_/b" },
    ]);
  });

  it("still renders doubled tildes as strikethrough", () => {
    expect(parseInlineSpans("~~doubled~~")).toEqual([
      { text: "doubled", strikethrough: true },
    ]);
  });

  it("still renders doubled asterisks as bold", () => {
    expect(parseInlineSpans("**bold**")).toEqual([
      { text: "bold", bold: true },
    ]);
  });

  it("still renders a single tilde pair at word boundaries as strikethrough", () => {
    expect(parseInlineSpans("hola ~chau~ fin")).toEqual([
      { text: "hola " },
      { text: "chau", strikethrough: true },
      { text: " fin" },
    ]);
  });
});

describe("formatting delimiters pair across an explicit link", () => {
  it("keeps a fully bold-wrapped link as a single bold link span", () => {
    expect(parseInlineSpans("**[x](https://example.com)**")).toEqual([
      { text: "x", bold: true, link: "https://example.com" },
    ]);
  });

  it("pairs bold delimiters opened before a link and closed after it", () => {
    expect(
      parseInlineSpans("**Ver el video [aqui](https://example.com) completo**"),
    ).toEqual([
      { text: "Ver el video ", bold: true },
      { text: "aqui", bold: true, link: "https://example.com" },
      { text: " completo", bold: true },
    ]);
  });

  it("pairs italic delimiters opened before a link and closed after it", () => {
    expect(parseInlineSpans("*ver [aqui](https://example.com)*")).toEqual([
      { text: "ver ", italic: true },
      { text: "aqui", italic: true, link: "https://example.com" },
    ]);
  });

  it("pairs strikethrough delimiters opened before a link and closed after it", () => {
    expect(parseInlineSpans("~~old [aqui](https://example.com)~~")).toEqual([
      { text: "old ", strikethrough: true },
      { text: "aqui", strikethrough: true, link: "https://example.com" },
    ]);
  });

  it("keeps a backtick-wrapped bare link as one literal code span", () => {
    expect(parseInlineSpans("`[x](https://example.com)`")).toEqual([
      { text: "[x](https://example.com)", code: true },
    ]);
  });

  it("keeps a backtick-wrapped link with surrounding text as one code span", () => {
    expect(parseInlineSpans("`ver [aqui](https://example.com)`")).toEqual([
      { text: "ver [aqui](https://example.com)", code: true },
    ]);
  });
});

describe("bare url immediately before an explicit link", () => {
  it("keeps the bare url tappable before a link with no separating space", () => {
    expect(
      parseInlineSpans("https://example.com[x](https://other.com)"),
    ).toEqual([
      { text: "https://example.com", link: "https://example.com" },
      { text: "x", link: "https://other.com" },
    ]);
  });

  it("keeps a bare url followed by a space and an explicit link working", () => {
    expect(
      parseInlineSpans("https://example.com [x](https://other.com)"),
    ).toEqual([
      { text: "https://example.com", link: "https://example.com" },
      { text: " " },
      { text: "x", link: "https://other.com" },
    ]);
  });

  it("keeps both the bold and the links on a bold-wrapped bare url before a link", () => {
    expect(
      parseInlineSpans("**https://example.com**[x](https://other.com)"),
    ).toEqual([
      { text: "https://example.com", bold: true, link: "https://example.com" },
      { text: "x", link: "https://other.com" },
    ]);
  });
});
