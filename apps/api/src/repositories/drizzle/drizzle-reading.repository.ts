import { eq, count, desc } from "drizzle-orm";
import {
  type SeedReading,
  generateEntityId,
  type SupportedLocale,
} from "@myself/shared";
import type { DbClient } from "../../db/client";
import {
  meditationReadings,
  meditationReadingTranslations,
  readingLogs,
} from "../../db/schema/readings";
import type {
  ReadingRepository,
  CreateReadingInput,
  ListReadingsParams,
  ListReadingsResult,
} from "../contracts/reading.repository";

type TranslationRow = typeof meditationReadingTranslations.$inferSelect;

function mapTranslations(rows: TranslationRow[]): SeedReading["translations"] {
  const entries = rows.map((r) => [
    r.locale,
    { title: r.title, content: r.content },
  ]);
  return Object.fromEntries(entries) as unknown as SeedReading["translations"];
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

    const items: SeedReading[] = [];
    for (const r of rows) {
      const translations = await this.db
        .select()
        .from(meditationReadingTranslations)
        .where(eq(meditationReadingTranslations.readingId, r.id));

      const logs = await this.db
        .select({ readAt: readingLogs.readAt })
        .from(readingLogs)
        .where(eq(readingLogs.readingId, r.id));

      items.push({
        id: r.id,
        author_id: r.author_id,
        createdAt: r.createdAt,
        readDates: logs.map((l) => l.readAt),
        translations: mapTranslations(translations),
      });
    }

    return {
      items,
      total: totalRow?.count ?? 0,
    };
  }

  async findById(id: string): Promise<SeedReading | null> {
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

    return {
      id: row.id,
      author_id: row.author_id,
      createdAt: row.createdAt,
      readDates: logs.map((l) => l.readAt),
      translations: mapTranslations(translations),
    };
  }

  async create(input: CreateReadingInput): Promise<SeedReading> {
    const id = generateEntityId();
    const createdAt = new Date().toISOString();

    await this.db.insert(meditationReadings).values({
      id,
      authorId: input.authorId,
      createdAt,
    });

    const translationInserts = Object.entries(input.translations)
      .filter(
        (
          entry,
        ): entry is [SupportedLocale, { title: string; content: string }] =>
          Boolean(entry[1] && (entry[1].title || entry[1].content)),
      )
      .map(([locale, trans]) => ({
        readingId: id,
        locale: locale as SupportedLocale,
        title: trans.title,
        content: trans.content,
      }));

    if (translationInserts.length > 0) {
      await this.db
        .insert(meditationReadingTranslations)
        .values(translationInserts);
    }

    return {
      id,
      author_id: input.authorId,
      createdAt,
      readDates: [],
      translations: Object.fromEntries(
        translationInserts.map((t) => [
          t.locale,
          { title: t.title, content: t.content },
        ]),
      ) as SeedReading["translations"],
    };
  }
}
