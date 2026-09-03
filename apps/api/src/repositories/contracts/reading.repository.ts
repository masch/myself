import type { SeedReading } from "@myself/shared";

export interface ListReadingsParams {
  limit: number;
  offset: number;
  authorId?: string;
}

export interface ListReadingsResult {
  items: SeedReading[];
  total: number;
}

export interface CreateReadingInput {
  authorId: string;
  translations: {
    es: { title: string; content: string };
    en?: { title: string; content: string };
  };
}

export interface ReadingRepository {
  list(params: ListReadingsParams): Promise<ListReadingsResult>;
  findById(id: string): Promise<SeedReading | null>;
  create(input: CreateReadingInput): Promise<SeedReading>;
}
