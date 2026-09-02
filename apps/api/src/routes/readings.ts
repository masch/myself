import { Hono } from "hono";
import {
  createReadingSchema,
  listReadingsQuerySchema,
  SEED_READINGS,
  type SeedReading,
} from "@myself/shared";
import { validatedJson, validatedQuery } from "../lib/validator";
import { ok, fail } from "../lib/response";
import { buildPaginated } from "../lib/pagination";

export const mockReadings: SeedReading[] = [...SEED_READINGS];

export const readingsRoute = new Hono()
  .get("/", validatedQuery(listReadingsQuerySchema), (c) => {
    const { limit, offset, authorId } = c.req.valid("query");

    const filtered = authorId
      ? mockReadings.filter((r) => r.author_id === authorId)
      : mockReadings;

    const total = filtered.length;
    const items = filtered.slice(offset, offset + limit);

    return ok(c, buildPaginated(items, total, limit, offset));
  })
  .get("/:id", (c) => {
    const id = c.req.param("id");
    const reading = mockReadings.find((r) => r.id === id);

    if (!reading) {
      return fail(c, "Reading not found", 404);
    }

    return ok(c, reading);
  })
  .post("/", validatedJson(createReadingSchema), async (c) => {
    const body = c.req.valid("json");

    const newReading: SeedReading = {
      id: `r-mock-${Date.now()}`,
      author_id: body.authorId,
      createdAt: new Date().toISOString(),
      readDates: [],
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
    };

    mockReadings.unshift(newReading);

    return ok(c, newReading, 201);
  });
