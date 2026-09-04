import type { Reading } from "../../domain";

export interface ListReadingsParams {
  limit: number;
  offset: number;
  authorId?: string;
}

export interface ListReadingsResult {
  items: Reading[];
  total: number;
}

export interface ReadingRepository {
  list(params: ListReadingsParams): Promise<ListReadingsResult>;
  findById(id: string): Promise<Reading | null>;
  create(reading: Reading): Promise<Reading>;
}
