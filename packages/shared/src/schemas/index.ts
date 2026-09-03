import { z } from "zod";

export const readingTranslationInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  content: z.string().trim().min(1, "Content is required"),
});

export const createReadingSchema = z.object({
  authorId: z.string().trim().min(1, "Author ID is required"),
  translations: z.object({
    es: readingTranslationInputSchema,
    en: readingTranslationInputSchema.optional(),
  }),
});

export const createAuthorSchema = z.object({
  name: z.string().trim().min(1, "Author name is required"),
  bio: z.string().trim().optional(),
});

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const listReadingsQuerySchema = paginationQuerySchema.extend({
  authorId: z.string().trim().optional(),
});

export const listAuthorsQuerySchema = paginationQuerySchema;

export const createUserSchema = z.object({
  name: z.string().trim().min(1, "User name is required"),
  email: z.email("Invalid email address"),
  avatarUrl: z.url("Invalid avatar URL").optional(),
});

export const listUsersQuerySchema = paginationQuerySchema;

export const entityIdSchema = z.uuid("Invalid ID format").brand<"EntityId">();

export type EntityId = z.infer<typeof entityIdSchema>;

export const uuidParamSchema = z.object({
  id: entityIdSchema,
});

export type CreateReadingInput = z.infer<typeof createReadingSchema>;
export type CreateAuthorInput = z.infer<typeof createAuthorSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type ListReadingsQuery = z.infer<typeof listReadingsQuerySchema>;
export type ListAuthorsQuery = z.infer<typeof listAuthorsQuerySchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type UuidParam = z.infer<typeof uuidParamSchema>;
