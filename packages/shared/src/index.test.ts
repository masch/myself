import { describe, expect, it } from "bun:test";
import {
  APP_NAME,
  createApiClient,
  createAuthorSchema,
  createReadingSchema,
  createUserSchema,
  entityIdSchema,
  ErrorCode,
  generateEntityId,
  HttpStatus,
  listAuthorsQuerySchema,
  listReadingsQuerySchema,
  paginationQuerySchema,
  uuidParamSchema,
  SEED_AUTHORS,
  SEED_AUTHOR_IDS,
  SEED_READINGS,
} from "./index";

describe("@myself/shared - Complete Functional & Schema Test Suite", () => {
  describe("Constants & Seed Data Integrity", () => {
    it("exports valid APP_NAME", () => {
      expect(APP_NAME).toBe("myself");
    });

    it("SEED_AUTHORS contains non-empty valid authors", () => {
      expect(SEED_AUTHORS.length).toBeGreaterThan(0);
      for (const author of SEED_AUTHORS) {
        expect(author.id).toBeDefined();
        expect(author.name.trim().length).toBeGreaterThan(0);
        expect(author.createdAt.trim().length).toBeGreaterThan(0);
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

    it("createUserSchema trims name, email, and avatarUrl", () => {
      const parsed = createUserSchema.parse({
        name: "  Marcus  ",
        email: "  marcus@rome.gov  ",
        avatarUrl: "  https://example.com/marcus.png  ",
      });
      expect(parsed.name).toBe("Marcus");
      expect(parsed.email).toBe("marcus@rome.gov");
      expect(parsed.avatarUrl).toBe("https://example.com/marcus.png");
    });

    it("uuidParamSchema validates valid UUID and rejects non-UUID strings", () => {
      const valid = uuidParamSchema.parse({
        id: "a0000000-0000-4000-8000-000000000001",
      });
      expect(valid.id).toBe("a0000000-0000-4000-8000-000000000001" as any);

      expect(() => uuidParamSchema.parse({ id: "not-a-uuid" })).toThrow();
      expect(() => uuidParamSchema.parse({ id: "" })).toThrow();
    });

    it("entityIdSchema parses valid branded EntityId and rejects non-UUID strings", () => {
      const valid = entityIdSchema.parse(
        "a0000000-0000-4000-8000-000000000001",
      );
      expect(valid).toBe("a0000000-0000-4000-8000-000000000001" as any);

      expect(() => entityIdSchema.parse("invalid-id")).toThrow();
      expect(() => entityIdSchema.parse("")).toThrow();
    });
  });

  describe("RPC Client Factory", () => {
    it("exports createApiClient function", () => {
      expect(typeof createApiClient).toBe("function");
    });
  });

  describe("Entity ID Generator (generateEntityId)", () => {
    it("generates a valid RFC4122 v4 UUID", () => {
      const id = generateEntityId();
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it("generates distinct unique IDs", () => {
      const id1 = generateEntityId();
      const id2 = generateEntityId();
      expect(id1).not.toBe(id2);
    });
  });

  describe("HttpStatus Constants", () => {
    it("exports standard HTTP status codes correctly", () => {
      expect(HttpStatus.OK).toBe(200);
      expect(HttpStatus.CREATED).toBe(201);
      expect(HttpStatus.ACCEPTED).toBe(202);
      expect(HttpStatus.NO_CONTENT).toBe(204);
      expect(HttpStatus.BAD_REQUEST).toBe(400);
      expect(HttpStatus.UNAUTHORIZED).toBe(401);
      expect(HttpStatus.FORBIDDEN).toBe(403);
      expect(HttpStatus.NOT_FOUND).toBe(404);
      expect(HttpStatus.CONFLICT).toBe(409);
      expect(HttpStatus.UNPROCESSABLE_ENTITY).toBe(422);
      expect(HttpStatus.INTERNAL_SERVER_ERROR).toBe(500);
    });
  });

  describe("ErrorCode Constants", () => {
    it("exports standard business error codes correctly", () => {
      expect(ErrorCode.INTERNAL_ERROR).toBe("INTERNAL_ERROR");
      expect(ErrorCode.BAD_REQUEST).toBe("BAD_REQUEST");
      expect(ErrorCode.NOT_FOUND).toBe("NOT_FOUND");
      expect(ErrorCode.UNAUTHORIZED).toBe("UNAUTHORIZED");
      expect(ErrorCode.FORBIDDEN).toBe("FORBIDDEN");
      expect(ErrorCode.CONFLICT).toBe("CONFLICT");
      expect(ErrorCode.USER_ALREADY_EXISTS).toBe("USER_ALREADY_EXISTS");
      expect(ErrorCode.ENTITY_NOT_FOUND).toBe("ENTITY_NOT_FOUND");
    });
  });
});
