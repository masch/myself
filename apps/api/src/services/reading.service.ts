import {
  type CreateReadingInput,
  DateTime,
  generateEntityId,
  type ReadingTranslationsMap,
} from "@myself/shared";
import { Reading } from "../domain";
import type {
  ListReadingsParams,
  ListReadingsResult,
  ReadingRepository,
} from "../repositories/contracts/reading.repository";

export { type CreateReadingInput };

export class ReadingService {
  constructor(private readonly readingRepo: ReadingRepository) {}

  async list(params: ListReadingsParams): Promise<ListReadingsResult> {
    return this.readingRepo.list(params);
  }

  async findById(id: string): Promise<Reading | null> {
    return this.readingRepo.findById(id);
  }

  async create(input: CreateReadingInput): Promise<Reading> {
    const id = generateEntityId();
    const createdAt = DateTime.now();

    const translations: ReadingTranslationsMap = {
      es: {
        title: input.translations.es.title.trim(),
        content: input.translations.es.content.trim(),
      },
    };

    if (
      input.translations.en &&
      (input.translations.en.title.trim() ||
        input.translations.en.content.trim())
    ) {
      translations.en = {
        title: input.translations.en.title.trim(),
        content: input.translations.en.content.trim(),
      };
    }

    const reading = new Reading({
      id,
      authorId: input.authorId.trim(),
      createdAt,
      readDates: [],
      translations,
    });

    return this.readingRepo.create(reading);
  }
}
