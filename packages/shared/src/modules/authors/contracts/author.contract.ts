import { z } from "zod";
import {
  entityIdSchema,
  dateTimeSchema,
  type EntityId,
} from "../../../primitives";
import { paginationQuerySchema } from "../../../pagination";

export interface AuthorDto {
  id: EntityId;
  name: string;
  bio?: string;
  created_at: string;
}

export const authorPropsSchema = z.object({
  id: entityIdSchema,
  name: z.string().trim().min(1, "Author name is required"),
  bio: z.string().trim().optional(),
  createdAt: dateTimeSchema,
});

export const createAuthorSchema = authorPropsSchema
  .pick({
    name: true,
    bio: true,
  })
  .extend({
    id: entityIdSchema.optional(),
  });

export type CreateAuthorInput = z.infer<typeof createAuthorSchema>;

export const listAuthorsQuerySchema = paginationQuerySchema;
export type ListAuthorsQuery = z.infer<typeof listAuthorsQuerySchema>;
