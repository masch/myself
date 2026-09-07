import { eq, count, desc, inArray } from "drizzle-orm";
import type { EntityId, SeedReading } from "@myself/shared";
import type { DbClient } from "../../../db/client";
import {
  meditationReadings,
  meditationReadingTranslations,
  readingLogs,
  SUPPORTED_LOCALES,
} from "../../../db/schema/readings";
import { type Reading } from "../../../domain";
import { ReadingMapper } from "../mappers/reading.mapper";
import type {
  ReadingRepository,
  ListReadingsParams,
  ListReadingsResult,
} from "../../../ports";

type TranslationRow = typeof meditationReadingTranslations.$inferSelect;

function mapTranslations(rows: TranslationRow[]): SeedReading["translations"] {
  const translations: SeedReading["translations"] = {
    es: { title: "", content: "" },
  };

  for (const row of rows) {
    translations[row.locale] = {
      title: row.title,
      content: row.content,
    };
  }

  return translations;
}

export class SqliteReadingRepository implements ReadingRepository {
  constructor(private readonly db: DbClient) {}

  async list(params: ListReadingsParams): Promise<ListReadingsResult> {
    const baseWhere = params.authorId
      ? eq(meditationReadings.authorId, params.authorId)
      : undefined;

    const [totalRow] = await this.db
      .select({ count: count() })
      .from(meditationReadings)
      .where(baseWhere);

    const rows = await this.db
      .select({
        id: meditationReadings.id,
        author_id: meditationReadings.authorId,
        createdAt: meditationReadings.createdAt,
      })
      .from(meditationReadings)
      .where(baseWhere)
      .limit(params.limit)
      .offset(params.offset)
      .orderBy(desc(meditationReadings.createdAt));

    if (rows.length === 0) {
      return {
        items: [],
        total: totalRow?.count ?? 0,
      };
    }

    const readingIds = rows.map((r) => r.id);

    const [allTranslations, allLogs] = await Promise.all([
      this.db
        .select()
        .from(meditationReadingTranslations)
        .where(inArray(meditationReadingTranslations.readingId, readingIds)),
      this.db
        .select({
          readingId: readingLogs.readingId,
          readAt: readingLogs.readAt,
        })
        .from(readingLogs)
        .where(inArray(readingLogs.readingId, readingIds)),
    ]);

    const translationsByReading = new Map<string, TranslationRow[]>();
    for (const t of allTranslations) {
      const list = translationsByReading.get(t.readingId) ?? [];
      list.push(t);
      translationsByReading.set(t.readingId, list);
    }

    const logsByReading = new Map<string, string[]>();
    for (const l of allLogs) {
      const list = logsByReading.get(l.readingId) ?? [];
      list.push(l.readAt);
      logsByReading.set(l.readingId, list);
    }

    const items: Reading[] = rows.map((r) =>
      ReadingMapper.toDomain({
        id: r.id,
        authorId: r.author_id,
        createdAt: r.createdAt,
        readDates: logsByReading.get(r.id) ?? [],
        translations: mapTranslations(translationsByReading.get(r.id) ?? []),
      }),
    );

    return {
      items,
      total: totalRow?.count ?? 0,
    };
  }

  async findById(id: EntityId): Promise<Reading | null> {
    const [row] = await this.db
      .select({
        id: meditationReadings.id,
        author_id: meditationReadings.authorId,
        createdAt: meditationReadings.createdAt,
      })
      .from(meditationReadings)
      .where(eq(meditationReadings.id, id))
      .limit(1);

    if (!row) {
      return null;
    }

    const translations = await this.db
      .select()
      .from(meditationReadingTranslations)
      .where(eq(meditationReadingTranslations.readingId, row.id));

    const logs = await this.db
      .select({ readAt: readingLogs.readAt })
      .from(readingLogs)
      .where(eq(readingLogs.readingId, row.id));

    return ReadingMapper.toDomain({
      id: row.id,
      authorId: row.author_id,
      createdAt: row.createdAt,
      readDates: logs.map((l) => l.readAt),
      translations: mapTranslations(translations),
    });
  }

  async create(reading: Reading): Promise<Reading> {
    const translationInserts: (typeof meditationReadingTranslations.$inferInsert)[] =
      [];

    for (const locale of SUPPORTED_LOCALES) {
      const trans = reading.translations[locale];
      if (trans && (trans.title || trans.content)) {
        translationInserts.push({
          readingId: reading.id,
          locale,
          title: trans.title,
          content: trans.content,
        });
      }
    }

    await this.db.transaction(async (tx) => {
      await tx
        .insert(meditationReadings)
        .values({
          id: reading.id,
          authorId: reading.authorId,
          createdAt: reading.createdAt.toISOString(),
        })
        .onConflictDoUpdate({
          target: meditationReadings.id,
          set: {
            authorId: reading.authorId,
          },
        });

      if (translationInserts.length > 0) {
        await tx
          .delete(meditationReadingTranslations)
          .where(eq(meditationReadingTranslations.readingId, reading.id));

        await tx
          .insert(meditationReadingTranslations)
          .values(translationInserts);
      }
    });

    return reading;
  }

  async update(reading: Reading): Promise<Reading> {
    const translationInserts: (typeof meditationReadingTranslations.$inferInsert)[] =
      [];

    for (const locale of SUPPORTED_LOCALES) {
      const trans = reading.translations[locale];
      if (trans && (trans.title || trans.content)) {
        translationInserts.push({
          readingId: reading.id,
          locale,
          title: trans.title,
          content: trans.content,
        });
      }
    }

    await this.db.transaction(async (tx) => {
      await tx
        .update(meditationReadings)
        .set({
          authorId: reading.authorId,
        })
        .where(eq(meditationReadings.id, reading.id));

      // Remove existing translations and insert updated set
      await tx
        .delete(meditationReadingTranslations)
        .where(eq(meditationReadingTranslations.readingId, reading.id));

      if (translationInserts.length > 0) {
        await tx
          .insert(meditationReadingTranslations)
          .values(translationInserts);
      }
    });

    return reading;
  }

  async delete(id: EntityId): Promise<boolean> {
    const result = await this.db.transaction(async (tx) => {
      await tx
        .delete(meditationReadingTranslations)
        .where(eq(meditationReadingTranslations.readingId, id));

      await tx.delete(readingLogs).where(eq(readingLogs.readingId, id));

      const deleted = await tx
        .delete(meditationReadings)
        .where(eq(meditationReadings.id, id))
        .returning({ id: meditationReadings.id });

      return deleted.length > 0;
    });

    return result;
  }
}
