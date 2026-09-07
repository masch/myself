import type { SupportedLocale } from "./locale";
import type { EntityId } from "../schemas";

export interface AuthorDto {
  id: EntityId;
  name: string;
  bio?: string;
  created_at: string;
}
export type { AuthorDto as Author };

export interface SeedAuthor {
  id: EntityId;
  name: string;
  bio?: string;
  createdAt: string;
}

export interface MeditationReading {
  id: EntityId;
  author_id: EntityId;
  created_at: string;
}

export interface MeditationReadingTranslation {
  reading_id: string;
  locale: SupportedLocale;
  title: string;
  content: string;
}

export interface ReadingLog {
  id: string;
  reading_id: string;
  read_at: string;
}

export interface MeditationReadingWithAuthor extends MeditationReading {
  locale: SupportedLocale;
  title: string;
  content: string;
  author_name: string;
  author_bio?: string;
  times_read: number;
  last_read_at: string | null;
}

export interface ReadingTranslationInput {
  title: string;
  content: string;
}

export type ReadingTranslationsMap = Partial<
  Record<SupportedLocale, ReadingTranslationInput>
> & {
  es: ReadingTranslationInput;
};

export interface SeedReading {
  id: EntityId;
  author_id: EntityId;
  createdAt: string;
  readDates: string[];
  translations: ReadingTranslationsMap;
}
