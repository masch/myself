import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  createReadingSchema,
  ErrorCode,
  HttpStatus,
  listReadingsQuerySchema,
} from "@myself/shared";
import type { AppEnv } from "../types";
import { defaultHook } from "../lib/validator";
import { ok, fail } from "../lib/response";
import { buildPaginated } from "../lib/pagination";

export const listReadingsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Readings"],
  summary: "List readings",
  description: "Returns a paginated list of meditation readings.",
  request: {
    query: listReadingsQuerySchema,
  },
  responses: {
    [HttpStatus.OK]: {
      description: "Paginated readings response",
    },
    [HttpStatus.BAD_REQUEST]: {
      description: "Invalid query parameters",
    },
  },
});

export const getReadingByIdRoute = createRoute({
  method: "get",
  path: "/:id",
  tags: ["Readings"],
  summary: "Get reading by ID",
  description: "Returns the reading details and its translations.",
  request: {
    params: z.object({
      id: z.string().min(1),
    }),
  },
  responses: {
    [HttpStatus.OK]: {
      description: "Reading found",
    },
    [HttpStatus.NOT_FOUND]: {
      description: "Reading not found",
    },
  },
});

export const createReadingRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Readings"],
  summary: "Create reading",
  description: "Registers a new reading with multilingual translations.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: createReadingSchema,
        },
      },
    },
  },
  responses: {
    [HttpStatus.CREATED]: {
      description: "Reading created successfully",
    },
    [HttpStatus.BAD_REQUEST]: {
      description: "Validation error",
    },
  },
});

export const readingsRoute = new OpenAPIHono<AppEnv>({ defaultHook })
  .openapi(listReadingsRoute, async (c) => {
    const { limit, offset, authorId } = c.req.valid("query");
    const { items, total } = await c.var.readingRepo.list({
      limit,
      offset,
      authorId,
    });

    return ok(c, buildPaginated(items, total, limit, offset));
  })
  .openapi(getReadingByIdRoute, async (c) => {
    const { id } = c.req.valid("param");
    const reading = await c.var.readingRepo.findById(id);

    if (!reading) {
      return fail(
        c,
        "Reading not found",
        HttpStatus.NOT_FOUND,
        ErrorCode.ENTITY_NOT_FOUND,
      );
    }

    return ok(c, reading);
  })
  .openapi(createReadingRoute, async (c) => {
    const body = c.req.valid("json");

    const newReading = await c.var.readingRepo.create({
      authorId: body.authorId,
      translations: {
        es: {
          title: body.translations.es.title,
          content: body.translations.es.content,
        },
        en:
          body.translations.en?.title || body.translations.en?.content
            ? {
                title: body.translations.en.title,
                content: body.translations.en.content,
              }
            : undefined,
      },
    });

    return ok(c, newReading, HttpStatus.CREATED);
  });
