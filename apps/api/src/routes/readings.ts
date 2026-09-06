import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import {
  createReadingSchema,
  updateReadingSchema,
  ErrorCode,
  HttpStatus,
  listReadingsQuerySchema,
  readingParamSchema,
} from "@myself/shared";
import type { AppEnv } from "../types";
import { defaultHook } from "../lib/validator";
import { ok, fail } from "../lib/response";
import { buildPaginated } from "../lib/pagination";
import { ReadingMapper } from "../adapters/persistence/mappers";
import { ReadingService } from "../services/reading.service";

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
    params: readingParamSchema,
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

export const updateReadingRoute = createRoute({
  method: "put",
  path: "/:id",
  tags: ["Readings"],
  summary: "Update reading",
  description: "Updates an existing reading and its multilingual translations.",
  request: {
    params: readingParamSchema,
    body: {
      content: {
        "application/json": {
          schema: updateReadingSchema,
        },
      },
    },
  },
  responses: {
    [HttpStatus.OK]: {
      description: "Reading updated successfully",
    },
    [HttpStatus.BAD_REQUEST]: {
      description: "Validation error",
    },
    [HttpStatus.NOT_FOUND]: {
      description: "Reading not found",
    },
  },
});

export const deleteReadingRoute = createRoute({
  method: "delete",
  path: "/:id",
  tags: ["Readings"],
  summary: "Delete reading",
  description: "Permanently deletes a reading and its translations.",
  request: {
    params: readingParamSchema,
  },
  responses: {
    [HttpStatus.OK]: {
      description: "Reading deleted successfully",
    },
    [HttpStatus.NOT_FOUND]: {
      description: "Reading not found",
    },
  },
});

export const readingsRoute = new OpenAPIHono<AppEnv>({ defaultHook })
  .openapi(listReadingsRoute, async (c) => {
    const { limit, offset, authorId } = c.req.valid("query");
    const service = new ReadingService(c.var.readingRepo);
    const { items, total } = await service.list({
      limit,
      offset,
      authorId,
    });

    const dtoList = items.map((item) => ReadingMapper.toDto(item));
    return ok(c, buildPaginated(dtoList, total, limit, offset));
  })
  .openapi(getReadingByIdRoute, async (c) => {
    const { id } = c.req.valid("param");
    const service = new ReadingService(c.var.readingRepo);
    const reading = await service.findById(id);

    if (!reading) {
      return fail(
        c,
        "Reading not found",
        HttpStatus.NOT_FOUND,
        ErrorCode.ENTITY_NOT_FOUND,
      );
    }

    return ok(c, ReadingMapper.toDto(reading));
  })
  .openapi(createReadingRoute, async (c) => {
    const body = c.req.valid("json");
    const service = new ReadingService(c.var.readingRepo);
    const newReading = await service.create(body);

    return ok(c, ReadingMapper.toDto(newReading), HttpStatus.CREATED);
  })
  .openapi(updateReadingRoute, async (c) => {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const service = new ReadingService(c.var.readingRepo);
    const updated = await service.update(id, body);

    return ok(c, ReadingMapper.toDto(updated), HttpStatus.OK);
  })
  .openapi(deleteReadingRoute, async (c) => {
    const { id } = c.req.valid("param");
    const service = new ReadingService(c.var.readingRepo);
    await service.delete(id);

    return ok(c, { id, deleted: true }, HttpStatus.OK);
  });
