import { describe, it, expect, mock, beforeEach } from "bun:test";
import { createApiClient } from "../api-client";
import type { EntityId } from "@myself/shared";

describe("Mobile ApiClient & Resources", () => {
  const baseUrl = "https://api.example.com";

  beforeEach(() => {
    mock.restore();
  });

  it("should fetch readings via api.readings.getAll", async () => {
    globalThis.fetch = mock(
      async () =>
        new Response(
          JSON.stringify({
            data: {
              items: [
                {
                  id: "r-1",
                  author_id: "a-1",
                  translations: { es: { title: "Hola", content: "Mundo" } },
                },
              ],
            },
          }),
          { status: 200 },
        ),
    ) as unknown as typeof fetch;

    const api = createApiClient(baseUrl);
    const readings = await api.readings.getAll();

    expect(readings.length).toBe(1);
    expect(readings[0].id).toBe("r-1" as EntityId);
  });

  it("should create author via api.authors.create and return id", async () => {
    globalThis.fetch = mock(
      async () =>
        new Response(JSON.stringify({ data: { id: "auth-123" } }), {
          status: 201,
        }),
    ) as unknown as typeof fetch;

    const api = createApiClient(baseUrl);
    const authorId = await api.authors.create({ name: "Marco Aurelio" });

    expect(authorId).toBe("auth-123");
  });

  it("should support updating and deleting readings", async () => {
    globalThis.fetch = mock(
      async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
    ) as unknown as typeof fetch;

    const api = createApiClient(baseUrl);
    const updated = await api.readings.update("r-1" as EntityId, {
      translations: { es: { title: "Nuevo", content: "Texto" } },
    });
    const deleted = await api.readings.delete("r-1" as EntityId);

    expect(updated).toBe(true);
    expect(deleted).toBe(true);
  });
});
