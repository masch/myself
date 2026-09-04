import { eq, count, desc, inArray } from "drizzle-orm";
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

    const items: SeedReading[] = rows.map((r) => ({
      id: r.id,
      author_id: r.author_id,
      createdAt: r.createdAt,
      readDates: logsByReading.get(r.id) ?? [],
      translations: mapTranslations(translationsByReading.get(r.id) ?? []),
    }));

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

    await this.db.transaction(async (tx) => {
      await tx.insert(meditationReadings).values({
        id,
        authorId: input.authorId,
        createdAt,
      });

      if (translationInserts.length > 0) {
        await tx
          .insert(meditationReadingTranslations)
          .values(translationInserts);
      }
    });

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
