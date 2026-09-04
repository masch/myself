import type { DateTime, ReadingTranslationsMap } from "@myself/shared";

export interface ReadingProps {
  id: string;
  authorId: string;
  createdAt: DateTime;
  readDates: DateTime[];
  translations: ReadingTranslationsMap;
}

export class Reading {
  constructor(public readonly props: ReadingProps) {}

  get id(): string {
    return this.props.id;
  }

  get authorId(): string {
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
}
