import { z } from "zod";
import { DateTime } from "../utils/date";

export const entityIdSchema = z
  .string()
  .trim()
  .check(z.uuid("Invalid ID format"))
  .brand<"EntityId">();

export type EntityId = z.infer<typeof entityIdSchema>;

export const dateTimeSchema = z.custom<DateTime>(
  (val) => val instanceof DateTime,
  "Invalid DateTime instance",
);

export const readingTranslationInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  content: z.string().trim().min(1, "Content is required"),
});

export const authorPropsSchema = z.object({
  id: entityIdSchema,
  name: z.string().trim().min(1, "Author name is required"),
  bio: z.string().trim().optional(),
  createdAt: dateTimeSchema,
});

export type AuthorProps = z.infer<typeof authorPropsSchema>;

export const createAuthorSchema = authorPropsSchema
  .pick({
    name: true,
    bio: true,
  })
  .extend({
    id: entityIdSchema.optional(),
  });

export const userPropsSchema = z.object({
  id: entityIdSchema,
  name: z.string().trim().min(1, "User name is required"),
  email: z.string().trim().check(z.email("Invalid email address")),
  avatarUrl: z.string().trim().check(z.url("Invalid avatar URL")).optional(),
  createdAt: dateTimeSchema,
});

export type UserProps = z.infer<typeof userPropsSchema>;

export const createUserSchema = userPropsSchema.pick({
  name: true,
  email: true,
  avatarUrl: true,
});

export const readingPropsSchema = z.object({
  id: entityIdSchema,
  authorId: entityIdSchema,
  createdAt: dateTimeSchema,
  readDates: z.array(dateTimeSchema).default([]),
  translations: z.object({
    es: readingTranslationInputSchema,
    en: readingTranslationInputSchema.optional(),
  }),
});

export type ReadingProps = z.infer<typeof readingPropsSchema>;

export const createReadingSchema = z.object({
  id: entityIdSchema.optional(),
  authorId: entityIdSchema,
  translations: z.object({
    es: readingTranslationInputSchema,
    en: readingTranslationInputSchema.optional(),
  }),
});

export const updateReadingSchema = z.object({
  authorId: entityIdSchema.optional(),
  translations: z.object({
    es: readingTranslationInputSchema,
    en: readingTranslationInputSchema.optional(),
  }),
});

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const listReadingsQuerySchema = paginationQuerySchema.extend({
  authorId: entityIdSchema.optional(),
});

export const listAuthorsQuerySchema = paginationQuerySchema;
export const listUsersQuerySchema = paginationQuerySchema;

export const uuidParamSchema = z.object({
  id: entityIdSchema,
});

export const readingParamSchema = z.object({
  id: entityIdSchema,
});

export type CreateReadingInput = z.infer<typeof createReadingSchema>;
export type UpdateReadingInput = z.infer<typeof updateReadingSchema>;
export type CreateAuthorInput = z.infer<typeof createAuthorSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type ListReadingsQuery = z.infer<typeof listReadingsQuerySchema>;
export type ListAuthorsQuery = z.infer<typeof listAuthorsQuerySchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type UuidParam = z.infer<typeof uuidParamSchema>;
export type ReadingParam = z.infer<typeof readingParamSchema>;
