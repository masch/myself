import { describe, expect, it } from "bun:test";
import { normalizeAuthorName, generateAuthorId } from "../author-id";
import { entityIdSchema } from "../entity-id";

describe("normalizeAuthorName", () => {
  it("trims whitespace and converts to lower case", () => {
    expect(normalizeAuthorName("  Marcus Aurelius  ")).toBe("marcus aurelius");
  });

  it("collapses multiple consecutive whitespace characters into a single space", () => {
    expect(normalizeAuthorName("Marcus \t  \n  Aurelius")).toBe(
      "marcus aurelius",
    );
  });

  it("normalizes diacritics and accents to base characters", () => {
    expect(normalizeAuthorName("Séneca")).toBe("seneca");
    expect(normalizeAuthorName("Marco Aurélio")).toBe("marco aurelio");
  });
});

describe("generateAuthorId", () => {
  it("returns a valid RFC4122 UUID v5 matching entityIdSchema", () => {
    const id = generateAuthorId("Marcus Aurelius");
    expect(() => entityIdSchema.parse(id)).not.toThrow();

    // Version 5 check: xxxxxxxx-xxxx-5xxx-yxxx-xxxxxxxxxxxx where y is [89ab]
    const parts = id.split("-");
    expect(parts.length).toBe(5);
    expect(parts[2].startsWith("5")).toBe(true);
    expect(["8", "9", "a", "b"].includes(parts[3][0])).toBe(true);
  });

  it("is strictly deterministic across varied casing, whitespace, and diacritics", () => {
    const id1 = generateAuthorId("Marcus Aurelius");
    const id2 = generateAuthorId("  marcus   aurelius  ");
    const id3 = generateAuthorId("MARCUS AURELIUS");

    expect(id1).toBe(id2);
    expect(id2).toBe(id3);

    const seneca1 = generateAuthorId("Séneca");
    const seneca2 = generateAuthorId("seneca");
    expect(seneca1).toBe(seneca2);
  });

  it("produces distinct UUIDs for different authors", () => {
    const id1 = generateAuthorId("Epictetus");
    const id2 = generateAuthorId("Seneca");
    expect(id1).not.toBe(id2);
  });
});
