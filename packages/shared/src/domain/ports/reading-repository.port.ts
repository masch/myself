import type { EntityId } from "../../schemas";
import type { PaginationParams, PaginatedResult } from "../../types/pagination";
import type { Reading } from "../entities/reading.entity";

export interface ListReadingsParams extends PaginationParams {
  authorId?: EntityId;
}

export type ListReadingsResult = PaginatedResult<Reading>;

export interface ReadingRepositoryPort {
  list(params: ListReadingsParams): Promise<ListReadingsResult>;
  findById(id: EntityId): Promise<Reading | null>;
  create(reading: Reading): Promise<Reading>;
  update(reading: Reading): Promise<Reading>;
  delete(id: EntityId): Promise<boolean>;
}
