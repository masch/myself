import type { PaginatedResponse, PaginationMeta } from "@myself/shared";

/**
 * Builds a standardized PaginatedResponse from items, total count, limit and offset.
 * Ideal for SQL/PostgreSQL queries (SELECT COUNT(*) and SELECT ... LIMIT $1 OFFSET $2).
 */
export function buildPaginated<T>(
  items: T[],
  total: number,
  limit: number,
  offset: number,
): PaginatedResponse<T> {
  const meta: PaginationMeta = {
    total,
    limit,
    offset,
    hasMore: offset + items.length < total,
  };

  return {
    items,
    meta,
  };
}
