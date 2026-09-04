import { eq, count, desc, inArray } from "drizzle-orm";
import type {
  ReadingTranslationInput,
  SeedReading,
  SupportedLocale,
} from "@myself/shared";
import type { DbClient } from "../../db/client";
import {
  meditationReadings,
  meditationReadingTranslations,
  readingLogs,
} from "../../db/schema/readings";
import { type Reading, ReadingMapper } from "../../domain";
import type {
  ReadingRepository,
  ListReadingsParams,
  ListReadingsResult,
} from "../contracts/reading.repository";

type TranslationRow = typeof meditationReadingTranslations.$inferSelect;

function mapTranslations(rows: TranslationRow[]): SeedReading["translations"] {
  const entries = rows.map((r) => [
    r.locale,
    { title: r.title, content: r.content },
  ]);
  const map = Object.fromEntries(entries) as Record<
    string,
    { title: string; content: string }
  >;
  return {
    ...map,
    es: map.es ?? { title: "", content: "" },
  } as unknown as SeedReading["translations"];
}

export class DrizzleReadingRepository implements ReadingRepository {
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

  async findById(id: string): Promise<Reading | null> {
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
    const translationInserts = (
      Object.entries(reading.translations) as [
        SupportedLocale,
        ReadingTranslationInput | undefined,
      ][]
    )
      .filter((entry): entry is [SupportedLocale, ReadingTranslationInput] =>
        Boolean(entry[1] && (entry[1].title || entry[1].content)),
      )
      .map(([locale, trans]) => ({
        readingId: reading.id,
        locale,
        title: trans.title,
        content: trans.content,
      }));

    await this.db.transaction(async (tx) => {
      await tx.insert(meditationReadings).values({
        id: reading.id,
        authorId: reading.authorId,
        createdAt: reading.createdAt.toISOString(),
      });

      if (translationInserts.length > 0) {
        await tx
          .insert(meditationReadingTranslations)
          .values(translationInserts);
      }
    });

    return reading;
  }
}
