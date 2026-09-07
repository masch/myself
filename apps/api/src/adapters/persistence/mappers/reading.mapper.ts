import {
  DateTime,
  type EntityId,
  Reading,
  type ReadingTranslationsMap,
  type SeedReading,
} from "@myself/shared";

export interface RawReadingRecord {
  id: EntityId;
  authorId: EntityId;
  createdAt: string;
  readDates?: string[];
  translations: ReadingTranslationsMap;
}

export class ReadingMapper {
  static toDomain(raw: RawReadingRecord): Reading {
    return new Reading({
      id: raw.id,
      authorId: raw.authorId,
      createdAt: DateTime.from(raw.createdAt),
      readDates: (raw.readDates ?? []).map((dateStr) => DateTime.from(dateStr)),
      translations: raw.translations,
    });
  }

  static toDto(entity: Reading): SeedReading {
    return {
      id: entity.id,
      author_id: entity.authorId,
      createdAt: entity.createdAt.toISOString(),
      readDates: entity.readDates.map((d) => d.toISOString()),
      translations: entity.translations,
    };
  }
}
