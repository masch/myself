import {
  entityIdSchema,
  type DateTime,
  type EntityId,
  type SupportedLocale,
} from "../../../primitives";

export interface ReadingTranslation {
  title: string;
  content: string;
}

export type ReadingTranslationsMap = Partial<
  Record<SupportedLocale, ReadingTranslation>
> & {
  es: ReadingTranslation;
};

export interface ReadingProps {
  id: EntityId;
  authorId: EntityId;
  createdAt: DateTime;
  readDates: DateTime[];
  translations: ReadingTranslationsMap;
}

export class Reading {
  public readonly props: ReadingProps;

  constructor(rawProps: ReadingProps) {
    const id = entityIdSchema.parse(rawProps.id);
    const authorId = entityIdSchema.parse(rawProps.authorId);
    if (
      !rawProps.translations?.es?.title ||
      !rawProps.translations?.es?.content
    ) {
      throw new Error("Spanish translation (title and content) is required");
    }
    this.props = {
      ...rawProps,
      id,
      authorId,
    };
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
}
