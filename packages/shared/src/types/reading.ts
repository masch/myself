import type { SupportedLocale } from "./locale";

export interface Author {
  id: string;
  name: string;
  bio?: string;
  created_at: string;
}

export interface SeedAuthor {
  id: string;
  name: string;
  bio?: string;
  createdAt: string;
}

export interface MeditationReading {
  id: string;
  author_id: string;
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
  id: string;
  author_id: string;
  createdAt: string;
  readDates: string[];
  translations: ReadingTranslationsMap;
}
