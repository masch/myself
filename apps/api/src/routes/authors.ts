import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import {
  createAuthorSchema,
  HttpStatus,
  listAuthorsQuerySchema,
} from "@myself/shared";
import type { AppEnv } from "../types";
import { defaultHook } from "../lib/validator";
import { ok } from "../lib/response";
import { buildPaginated } from "../lib/pagination";
import { AuthorService } from "../services/author.service";

export const listAuthorsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Authors"],
  summary: "List authors",
  description: "Returns a paginated list of philosophical authors.",
  request: {
    query: listAuthorsQuerySchema,
  },
  responses: {
    [HttpStatus.OK]: {
      description: "Paginated authors response",
    },
    [HttpStatus.BAD_REQUEST]: {
      description: "Invalid pagination parameters",
    },
  },
});

export const createAuthorRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Authors"],
  summary: "Create author",
  description: "Registers a new philosophical author.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: createAuthorSchema,
        },
      },
    },
  },
  responses: {
    [HttpStatus.CREATED]: {
      description: "Author created successfully",
    },
    [HttpStatus.BAD_REQUEST]: {
      description: "Validation error",
    },
  },
});

export const authorsRoute = new OpenAPIHono<AppEnv>({ defaultHook })
  .openapi(listAuthorsRoute, async (c) => {
    const { limit, offset } = c.req.valid("query");
    const service = new AuthorService(c.var.authorRepo);
    const { items, total } = await service.list({ limit, offset });

    return ok(c, buildPaginated(items, total, limit, offset));
  })
  .openapi(createAuthorRoute, async (c) => {
    const body = c.req.valid("json");
    const service = new AuthorService(c.var.authorRepo);
    const newAuthor = await service.create({
      name: body.name,
      bio: body.bio,
    });

    return ok(c, newAuthor, HttpStatus.CREATED);
  });
