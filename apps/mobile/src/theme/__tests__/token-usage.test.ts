import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const SRC_DIR = join(import.meta.dir, "..", "..");
const TOKENS_DIR = join(import.meta.dir, "..");

/**
 * Guards the design system boundary: font sizes and line heights must come from
 * `@/theme` tokens, never from literals. A literal typed inside a screen silently
 * escapes every future scale change, which is exactly how the app drifted into
 * 15 different sizes for 8 tokens.
 *
 * The token module itself is the only place allowed to hold raw numbers, because
 * that is where the scale is defined.
 */
function collectSourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === "__tests__" || entry.name === "node_modules") continue;
      if (path === TOKENS_DIR) continue;
      collectSourceFiles(path, acc);
      continue;
    }

    if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))
      acc.push(path);
  }

  return acc;
}

const LITERAL_SIZE = /\b(fontSize|lineHeight)\s*:\s*\d+(?:\.\d+)?\b/g;

describe("design token usage", () => {
  it("never hardcodes a font size or line height outside the token module", () => {
    const violations: string[] = [];

    for (const file of collectSourceFiles(SRC_DIR)) {
      const lines = readFileSync(file, "utf8").split("\n");

      lines.forEach((line, index) => {
        for (const match of line.matchAll(LITERAL_SIZE)) {
          violations.push(
            `${relative(SRC_DIR, file)}:${index + 1} — ${match[0]}`,
          );
        }
      });
    }

    expect(violations).toEqual([]);
  });
});
