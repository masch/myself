import type {
  EntityId,
  PaginationParams,
  PaginatedResult,
  Reading,
} from "@myself/shared";

export interface ListReadingsParams extends PaginationParams {
  authorId?: EntityId;
}

export type ListReadingsResult = PaginatedResult<Reading>;

export interface ReadingRepository {
  list(params: ListReadingsParams): Promise<ListReadingsResult>;
  findById(id: EntityId): Promise<Reading | null>;
  create(reading: Reading): Promise<Reading>;
  update(reading: Reading): Promise<Reading>;
  delete(id: EntityId): Promise<boolean>;
}

export type ReadingRepositoryPort = ReadingRepository;
