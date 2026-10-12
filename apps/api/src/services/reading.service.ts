import {
  type CreateReadingInput,
  type UpdateReadingInput,
  DateTime,
  type EntityId,
  generateEntityId,
  type ReadingTranslationsMap,
  assertOptimisticLock,
  Reading,
} from "@myself/shared";
import type {
  ListReadingsParams,
  ListReadingsResult,
  ReadingRepository,
} from "../ports";
import { BadRequestError, NotFoundError } from "../errors";

export { type CreateReadingInput, type UpdateReadingInput };

export class ReadingService {
  constructor(private readonly readingRepo: ReadingRepository) {}

  /**
   * Lists readings matching criteria with pagination support.
   */
  async list(params: ListReadingsParams): Promise<ListReadingsResult> {
    return this.readingRepo.list(params);
  }

  /**
   * Retrieves a reading by entity ID.
   */
  async findById(id: EntityId): Promise<Reading | null> {
    return this.readingRepo.findById(id);
  }

  /**
   * Creates a new reading aggregate with version initialized to 1.
   */
  async create(input: CreateReadingInput): Promise<Reading> {
    const id = input.id ?? generateEntityId();
    const createdAt = DateTime.now();

    const translations = this.validateTranslations(input.translations);

    const reading = new Reading({
      id,
      authorId: input.authorId,
      createdAt,
      readDates: [],
      translations,
    });

    return this.readingRepo.create(reading);
  }

  /**
   * Updates a reading aggregate using optimistic concurrency control.
   * Asserts lock against expected version and increments version monotonically.
   */
  async update(id: EntityId, input: UpdateReadingInput): Promise<Reading> {
    const existing = await this.readingRepo.findById(id);
    if (!existing) {
      throw new NotFoundError(`Reading ${id} not found`);
    }

    assertOptimisticLock(existing.version, input.version);

    const translations = this.validateTranslations(input.translations);

    const updated = new Reading({
      id: existing.id,
      authorId: input.authorId ?? existing.authorId,
      createdAt: existing.createdAt,
      readDates: existing.readDates,
      translations,
      version: existing.version + 1,
    });

    return this.readingRepo.update(updated);
  }

  /**
   * Permanently deletes a reading aggregate.
   */
  async delete(id: EntityId): Promise<void> {
    const existing = await this.readingRepo.findById(id);
    if (!existing) {
      throw new NotFoundError(`Reading ${id} not found`);
    }

    await this.readingRepo.delete(id);
  }

  private validateTranslations(
    inputTranslations: CreateReadingInput["translations"],
  ): ReadingTranslationsMap {
    const translations: ReadingTranslationsMap = {
      es: {
        title: inputTranslations.es.title.trim(),
        content: inputTranslations.es.content.trim(),
      },
    };

    if (inputTranslations.en) {
      const enTitle = inputTranslations.en.title.trim();
      const enContent = inputTranslations.en.content.trim();

      if (enTitle && enContent) {
        translations.en = {
          title: enTitle,
          content: enContent,
        };
      } else if (enTitle || enContent) {
        throw new BadRequestError(
          "English translation requires both title and content to be provided",
        );
      }
    }

    return translations;
  }
}
