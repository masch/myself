import { Hono } from "hono";
import {
  createAuthorSchema,
  listAuthorsQuerySchema,
  SEED_AUTHORS,
  type SeedAuthor,
} from "@myself/shared";
import { validatedJson, validatedQuery } from "../lib/validator";
import { ok } from "../lib/response";
import { buildPaginated } from "../lib/pagination";

export const mockAuthors: SeedAuthor[] = [...SEED_AUTHORS];

export const authorsRoute = new Hono()
  .get("/", validatedQuery(listAuthorsQuerySchema), (c) => {
    const { limit, offset } = c.req.valid("query");
    const total = mockAuthors.length;
    const items = mockAuthors.slice(offset, offset + limit);

    return ok(c, buildPaginated(items, total, limit, offset));
  })
  .post("/", validatedJson(createAuthorSchema), async (c) => {
    const body = c.req.valid("json");
    const newAuthor: SeedAuthor = {
      id: `a-mock-${Date.now()}`,
      name: body.name,
      bio: body.bio ?? "",
    };
    mockAuthors.push(newAuthor);

    return ok(c, newAuthor, 201);
  });
