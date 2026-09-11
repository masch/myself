import { z } from "zod";
import {
  entityIdSchema,
  dateTimeSchema,
  type EntityId,
  type SupportedLocale,
} from "../../../primitives";
import { paginationQuerySchema } from "../../../pagination";
import type { ReadingTranslationsMap } from "../domain/reading.entity";

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

export interface ReadingDto {
  id: EntityId;
  author_id: EntityId;
  createdAt: string;
  readDates: string[];
  translations: ReadingTranslationsMap;
}

export type SeedReading = ReadingDto;

export interface ReadingTranslationInput {
  title: string;
  content: string;
}

export const readingTranslationInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  content: z.string().trim().min(1, "Content is required"),
});

export const readingPropsSchema = z.object({
  id: entityIdSchema,
  authorId: entityIdSchema,
  createdAt: dateTimeSchema,
  readDates: z.array(dateTimeSchema).default([]),
  translations: z.object({
    es: readingTranslationInputSchema,
    en: readingTranslationInputSchema.optional(),
  }),
});

export const createReadingSchema = z.object({
  id: entityIdSchema.optional(),
  authorId: entityIdSchema,
  translations: z.object({
    es: readingTranslationInputSchema,
    en: readingTranslationInputSchema.optional(),
  }),
});

export const updateReadingSchema = z.object({
  authorId: entityIdSchema.optional(),
  translations: z.object({
    es: readingTranslationInputSchema,
    en: readingTranslationInputSchema.optional(),
  }),
});

export const listReadingsQuerySchema = paginationQuerySchema.extend({
  authorId: entityIdSchema.optional(),
});

export const readingParamSchema = z.object({
  id: entityIdSchema,
});

export type CreateReadingInput = z.infer<typeof createReadingSchema>;
export type UpdateReadingInput = z.infer<typeof updateReadingSchema>;
export type ListReadingsQuery = z.infer<typeof listReadingsQuerySchema>;
export type ReadingParam = z.infer<typeof readingParamSchema>;
