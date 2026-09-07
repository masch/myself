import { beforeEach, describe, expect, it } from "bun:test";
import type { EntityId } from "@myself/shared";
import { ReadingService } from "../reading.service";
import { BadRequestError } from "../../errors";
import { SqliteReadingRepository } from "../../adapters/persistence/sqlite/sqlite-reading.repository";
import { SqliteAuthorRepository } from "../../adapters/persistence/sqlite/sqlite-author.repository";
import { AuthorService } from "../author.service";
import { createTestDatabase } from "../../db/test-db";

describe("ReadingService Domain Application Service Unit Tests", () => {
  let readingRepo: SqliteReadingRepository;
  let service: ReadingService;
  let authorService: AuthorService;
  let testAuthorId: EntityId;

  beforeEach(async () => {
    const db = await createTestDatabase({ seed: false });
    readingRepo = new SqliteReadingRepository(db);
    service = new ReadingService(readingRepo);
    authorService = new AuthorService(new SqliteAuthorRepository(db));

    const author = await authorService.create({
      name: "Marcus Aurelius",
    });
    testAuthorId = author.id;
  });

  it("creates a reading with generated UUID, ISO timestamp, readDates initialized to empty array, and trimmed translations", async () => {
    const reading = await service.create({
      authorId: testAuthorId,
      translations: {
        es: {
          title: "  De la serenidad  ",
          content: "  El alma se tiñe del color de sus pensamientos.  ",
        },
        en: {
          title: "  On Serenity  ",
          content: "  The soul becomes dyed with the color of its thoughts.  ",
        },
      },
    });

    expect(reading.id).toBeDefined();
    expect(reading.authorId).toBe(testAuthorId);
    expect(reading.createdAt).toBeDefined();
    expect(reading.createdAt.toISOString()).toBeDefined();
    expect(reading.readDates).toEqual([]);
    expect(reading.translations.es.title).toBe("De la serenidad");
    expect(reading.translations.es.content).toBe(
      "El alma se tiñe del color de sus pensamientos.",
    );
    expect(reading.translations.en?.title).toBe("On Serenity");
    expect(reading.translations.en?.content).toBe(
      "The soul becomes dyed with the color of its thoughts.",
    );

    const stored = await service.findById(reading.id);
    expect(stored).toEqual(reading);
  });

  it("handles optional en translation gracefully when omitted or blank", async () => {
    const reading = await service.create({
      authorId: testAuthorId,
      translations: {
        es: {
          title: "Meditación matutina",
          content: "Cuando te levantes por la mañana...",
        },
        en: {
          title: "   ",
          content: "   ",
        },
      },
    });

    expect(reading.translations.es.title).toBe("Meditación matutina");
    expect(reading.translations.en).toBeUndefined();

    const stored = await service.findById(reading.id);
    expect(stored?.translations.en).toBeUndefined();
  });

  it("rejects en translation when title is provided but content is blank", async () => {
    expect(
      service.create({
        authorId: testAuthorId,
        translations: {
          es: {
            title: "Título",
            content: "Contenido",
          },
          en: {
            title: "Title",
            content: "   ",
          },
        },
      }),
    ).rejects.toThrow(BadRequestError);
  });

  it("rejects en translation when content is provided but title is blank", async () => {
    expect(
      service.create({
        authorId: testAuthorId,
        translations: {
          es: {
            title: "Título",
            content: "Contenido",
          },
          en: {
            title: "   ",
            content: "Content",
          },
        },
      }),
    ).rejects.toThrow(BadRequestError);
  });

  it("lists readings with pagination and authorId filter through service", async () => {
    const author2 = await authorService.create({ name: "Epictetus" });

    await service.create({
      authorId: testAuthorId,
      translations: {
        es: {
          title: "Meditación 1",
          content: "Contenido 1",
        },
      },
    });
    await service.create({
      authorId: author2.id,
      translations: {
        es: {
          title: "Enchiridion 1",
          content: "Algunas cosas dependen de nosotros...",
        },
      },
    });
    await service.create({
      authorId: author2.id,
      translations: {
        es: {
          title: "Enchiridion 2",
          content: "Recuerda que el deseo promete...",
        },
      },
    });

    const allReadings = await service.list({ limit: 10, offset: 0 });
    expect(allReadings.items.length).toBe(3);
    expect(allReadings.total).toBe(3);

    const author2Readings = await service.list({
      limit: 10,
      offset: 0,
      authorId: author2.id,
    });
    expect(author2Readings.items.length).toBe(2);
    expect(author2Readings.total).toBe(2);
    expect(
      author2Readings.items.every((item) => item.authorId === author2.id),
    ).toBe(true);
  });

  it("updates an existing reading translations and preserves created_at and logs", async () => {
    const reading = await service.create({
      authorId: testAuthorId,
      translations: {
        es: {
          title: "Título Original",
          content: "Contenido original",
        },
      },
    });

    const updated = await service.update(reading.id, {
      translations: {
        es: {
          title: "Título Modificado",
          content: "Contenido modificado",
        },
        en: {
          title: "Updated Title",
          content: "Updated Content",
        },
      },
    });

    expect(updated.id).toBe(reading.id);
    expect(updated.translations.es.title).toBe("Título Modificado");
    expect(updated.translations.en?.title).toBe("Updated Title");

    const fetched = await service.findById(reading.id);
    expect(fetched?.translations.es.title).toBe("Título Modificado");
    expect(fetched?.translations.en?.title).toBe("Updated Title");
  });

  it("deletes an existing reading", async () => {
    const reading = await service.create({
      authorId: testAuthorId,
      translations: {
        es: {
          title: "Para Borrar",
          content: "Contenido a borrar",
        },
      },
    });

    await service.delete(reading.id);
    const fetched = await service.findById(reading.id);
    expect(fetched).toBeNull();
  });
});
