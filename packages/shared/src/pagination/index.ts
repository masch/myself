import { z } from "zod";
import { entityIdSchema } from "../primitives/entity-id";

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export const uuidParamSchema = z.object({
  id: entityIdSchema,
});

export type UuidParam = z.infer<typeof uuidParamSchema>;

export interface PaginationParams {
  limit: number;
  offset: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
}

export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}
