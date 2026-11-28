import { beforeAll, describe, expect, it } from "bun:test";
import { createApp } from "../../app";
import { AppConfig } from "../../config";

/**
 * S7 removed the anonymous users surface. What matters behaviourally is that the three
 * routes are gone, not that a handler was deleted, so this drives the real app over
 * HTTP and reads the OpenAPI document it publishes.
 */
describe("anonymous /v1/users surface is removed (S7)", () => {
  let app: ReturnType<typeof createApp>;

  const REMOVED_ROUTE_ID = "e0000000-0000-4000-8000-000000000001";

  beforeAll(() => {
    app = createApp(
      AppConfig.from({
        ENVIRONMENT: "test",
        TURSO_DATABASE_URL: ":memory:",
      }),
    );
  });

  it("answers 404 for GET /v1/users, GET /v1/users/:id and POST /v1/users", async () => {
    const requests: Array<[string, string]> = [
      ["GET", "/v1/users"],
      ["GET", `/v1/users/${REMOVED_ROUTE_ID}`],
      ["POST", "/v1/users"],
    ];

    for (const [method, path] of requests) {
      const res = await app.request(path, {
        method,
        ...(method === "POST"
          ? {
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: "Anonymous",
                email: "anonymous@example.com",
              }),
            }
          : {}),
      });

      expect(`${method} ${path} -> ${res.status}`).toBe(
        `${method} ${path} -> 404`,
      );
      const body = (await res.json()) as { error: string; code?: string };
      expect(body.error).toBe("Endpoint not found");
      // The global 404 handler does not attach a business code; it is not a route error.
      expect(body.code).toBeUndefined();
    }
  });

  it("no longer publishes /v1/users in the OpenAPI document", async () => {
    const res = await app.request("/doc");
    expect(res.status).toBe(200);
    const doc = (await res.json()) as { paths: Record<string, unknown> };

    expect(doc.paths["/v1/users"]).toBeUndefined();
    expect(
      Object.keys(doc.paths).some((path) => path.startsWith("/v1/users")),
    ).toBe(false);

    // The curated resources are untouched.
    expect(doc.paths["/v1/authors"]).toBeDefined();
    expect(doc.paths["/v1/readings"]).toBeDefined();
  });
});
