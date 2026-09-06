import type { DateTime } from "../../utils/date";
import type { ReadingTranslationsMap } from "../../types/reading";
import type { SupportedLocale } from "../../types/locale";
import {
  type EntityId,
  type ReadingProps,
  readingPropsSchema,
} from "../../schemas";

export { type ReadingProps };

export class Reading {
  public readonly props: ReadingProps;

  constructor(rawProps: ReadingProps) {
    this.props = readingPropsSchema.parse(rawProps);
  }

  get id(): EntityId {
    return this.props.id;
  }

  get authorId(): EntityId {
    return this.props.authorId;
  }

  get createdAt(): DateTime {
    return this.props.createdAt;
  }

  get readDates(): DateTime[] {
    return this.props.readDates;
  }

  get translations(): ReadingTranslationsMap {
    return this.props.translations;
  }

  /**
   * Returns translation for requested locale, falling back to Spanish or first available.
   */
  getTranslation(
    locale: SupportedLocale,
  ): { title: string; content: string } | undefined {
    return this.props.translations[locale] ?? this.props.translations.es;
  }

  /**
   * Checks if reading was completed today based on readDates.
   */
  isCompletedToday(): boolean {
    const today = new Date().toISOString().slice(0, 10);
    return this.props.readDates.some(
      (date) => date.toISOString().slice(0, 10) === today,
    );
  }
}
