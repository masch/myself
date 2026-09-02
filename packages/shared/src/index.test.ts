import { describe, expect, it } from "bun:test";
import {
  APP_NAME,
  createApiClient,
  createAuthorSchema,
  createReadingSchema,
  listAuthorsQuerySchema,
  listReadingsQuerySchema,
  paginationQuerySchema,
  SEED_AUTHORS,
  SEED_AUTHOR_IDS,
  SEED_READINGS,
} from "./index";

describe("@myself/shared - Complete Functional & Schema Test Suite", () => {
  describe("Constants & Mocks Integrity", () => {
    it("exports valid APP_NAME", () => {
      expect(APP_NAME).toBe("myself");
    });

    it("SEED_AUTHORS contains non-empty valid authors", () => {
      expect(SEED_AUTHORS.length).toBeGreaterThan(0);
      for (const author of SEED_AUTHORS) {
        expect(author.id).toBeDefined();
        expect(author.name.trim().length).toBeGreaterThan(0);
      }
    });

    it("SEED_READINGS contains non-empty valid readings matching known author IDs", () => {
      expect(SEED_READINGS.length).toBeGreaterThan(0);
      const authorIdSet = new Set(Object.values(SEED_AUTHOR_IDS));

      for (const reading of SEED_READINGS) {
        expect(reading.id).toBeDefined();
        expect(authorIdSet.has(reading.author_id as any)).toBe(true);
        expect(reading.translations.es.title.trim().length).toBeGreaterThan(0);
        expect(reading.translations.es.content.trim().length).toBeGreaterThan(
          0,
        );
      }
    });
  });

  describe("Validation Schemas: Pagination & Queries", () => {
    it("paginationQuerySchema sets default limit to 20 and offset to 0", () => {
      const parsed = paginationQuerySchema.parse({});
      expect(parsed.limit).toBe(20);
      expect(parsed.offset).toBe(0);
    });

    it("paginationQuerySchema coerces string numbers into integers", () => {
      const parsed = paginationQuerySchema.parse({ limit: "15", offset: "30" });
      expect(parsed.limit).toBe(15);
      expect(parsed.offset).toBe(30);
    });

    it("paginationQuerySchema rejects invalid limits (negative, zero, or above 100)", () => {
      expect(() => paginationQuerySchema.parse({ limit: -1 })).toThrow();
      expect(() => paginationQuerySchema.parse({ limit: 0 })).toThrow();
      expect(() => paginationQuerySchema.parse({ limit: 101 })).toThrow();
    });

    it("listReadingsQuerySchema parses authorId correctly alongside pagination", () => {
      const parsed = listReadingsQuerySchema.parse({
        authorId: " author-123 ",
        limit: "10",
      });
      expect(parsed.authorId).toBe("author-123");
      expect(parsed.limit).toBe(10);
      expect(parsed.offset).toBe(0);
    });
  });

  describe("Validation Schemas: Creation Inputs", () => {
    it("createAuthorSchema parses valid author and trims fields", () => {
      const parsed = createAuthorSchema.parse({
        name: "  Marcus Aurelius  ",
        bio: "  Emperor and Philosopher  ",
      });
      expect(parsed.name).toBe("Marcus Aurelius");
      expect(parsed.bio).toBe("Emperor and Philosopher");
    });

    it("createAuthorSchema throws for empty or missing name", () => {
      expect(() => createAuthorSchema.parse({ name: "   " })).toThrow();
      expect(() => createAuthorSchema.parse({})).toThrow();
    });

    it("createReadingSchema parses valid reading with spanish translation", () => {
      const parsed = createReadingSchema.parse({
        authorId: "author-1",
        translations: {
          es: {
            title: " Título en español ",
            content: " Contenido en español ",
          },
        },
      });
      expect(parsed.authorId).toBe("author-1");
      expect(parsed.translations.es.title).toBe("Título en español");
      expect(parsed.translations.es.content).toBe("Contenido en español");
      expect(parsed.translations.en).toBeUndefined();
    });

    it("createReadingSchema throws when spanish title or content is missing", () => {
      expect(() =>
        createReadingSchema.parse({
          authorId: "author-1",
          translations: {
            es: { title: "   ", content: "Contenido" },
          },
        }),
      ).toThrow();

      expect(() =>
        createReadingSchema.parse({
          authorId: "author-1",
          translations: {
            es: { title: "Título", content: "   " },
          },
        }),
      ).toThrow();
    });
  });

  describe("RPC Client Factory", () => {
    it("exports createApiClient function", () => {
      expect(typeof createApiClient).toBe("function");
    });
  });
});
