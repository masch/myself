import { beforeAll, describe, expect, it } from "bun:test";
import {
  APP_NAME,
  SEED_AUTHORS,
  SEED_AUTHOR_IDS,
  SEED_READINGS,
  type ApiResponse,
  type PaginatedResponse,
  type SeedAuthor,
  type SeedReading,
} from "@myself/shared";
import { createApp } from "./index";
import { AppConfig } from "./config";
import { createRepositories } from "./middleware/repositories";
import { createTestRepositories } from "./db/test-db";

describe("myself API Gateway - Full E2E Test Suite (HTTP -> SQLite Database)", () => {
  let app: ReturnType<typeof createApp>;
  let testConfig: AppConfig;

  beforeAll(async () => {
    testConfig = AppConfig.from({
      ENVIRONMENT: "test",
      TURSO_DATABASE_URL: ":memory:",
    });
    const repos = await createTestRepositories({ seed: true });
    app = createApp(testConfig, repos);
  });

  describe("Root & System Health", () => {
    it("createApp supports passing custom required dependencies directly", async () => {
      const testRepos = await createTestRepositories({ seed: true });
      const customApp = createApp(testConfig, testRepos);
      const res = await customApp.request("/v1/authors");
      expect(res.status).toBe(200);
    });

    it("fails fast when TURSO_DATABASE_URL is missing in AppConfig", () => {
      expect(() =>
        AppConfig.from({ ENVIRONMENT: "test" }),
      ).toThrow("Missing required configuration: TURSO_DATABASE_URL");
    });

    it("GET / returns welcome message and current timestamp", async () => {
      const res = await app.request("/");
      expect(res.status).toBe(200);

      const body = (await res.json()) as ApiResponse<{
        message: string;
        timestamp: string;
      }>;
      expect(body.success).toBe(true);
      expect(body.data?.message).toBe(`Welcome to ${APP_NAME} API`);
      expect(new Date(body.data?.timestamp ?? "").getTime()).not.toBeNaN();
    });

    it("GET /health returns status ok, uptime number, and environment", async () => {
      const res = await app.request("/health");
      expect(res.status).toBe(200);

      const body = (await res.json()) as ApiResponse<{
        status: string;
        uptime: number;
        environment: string;
      }>;
      expect(body.success).toBe(true);
      expect(body.data?.status).toBe("ok");
      expect(typeof body.data?.uptime).toBe("number");
      expect(body.data?.uptime).toBeGreaterThanOrEqual(0);
      expect(body.data?.environment).toBe("test");
    });

    it("GET /health reflects app environment from configuration", async () => {
      const testRepos = await createTestRepositories({ seed: true });
      const stagingConfig = AppConfig.from({
        ENVIRONMENT: "staging",
        TURSO_DATABASE_URL: ":memory:",
      });
      const stagingApp = createApp(stagingConfig, testRepos);
      const res = await stagingApp.request("/health");
      expect(res.status).toBe(200);

      const body = (await res.json()) as ApiResponse<{
        status: string;
        uptime: number;
        environment: string;
      }>;
      expect(body.success).toBe(true);
      expect(body.data?.environment).toBe("staging");
    });

    it("fails fast at boot time when ENVIRONMENT is missing", () => {
      const originalEnv = process.env.ENVIRONMENT;
      delete process.env.ENVIRONMENT;
      try {
        expect(() =>
          AppConfig.from({ TURSO_DATABASE_URL: ":memory:" }),
        ).toThrow(/Missing required ENVIRONMENT configuration/);
      } finally {
        process.env.ENVIRONMENT = originalEnv;
      }
    });

    it("fails fast at boot time when ENVIRONMENT is invalid", () => {
      expect(() =>
        AppConfig.from({
          ENVIRONMENT: "stagin",
          TURSO_DATABASE_URL: ":memory:",
        }),
      ).toThrow(/Invalid ENVIRONMENT configuration/);
    });

    it("GET /doc returns valid OpenAPI 3.1 schema document", async () => {
      const res = await app.request("/doc");
      expect(res.status).toBe(200);

      const doc = (await res.json()) as {
        openapi: string;
        info: { title: string };
        paths: Record<string, unknown>;
      };
      expect(doc.openapi).toBe("3.1.0");
      expect(doc.info.title).toBe("myself API");
      expect(doc.paths["/v1/users"]).toBeDefined();
      expect(doc.paths["/v1/authors"]).toBeDefined();
      expect(doc.paths["/v1/readings"]).toBeDefined();
    });

    it("GET /reference serves the Scalar API reference HTML UI", async () => {
      const res = await app.request("/reference");
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/html");

      const html = await res.text();
      expect(html).toContain("<!doctype html>");
      expect(html).toContain("Scalar");
    });

    it("GET /non-existent-route returns standard 404 ApiResponse", async () => {
      const res = await app.request("/unknown-random-path");
      expect(res.status).toBe(404);

      const body = (await res.json()) as ApiResponse<never>;
      expect(body.success).toBe(false);
      expect(body.error).toBe("Endpoint not found");
      expect(body.data).toBeUndefined();
    });

    it("handles CORS headers on preflight requests", async () => {
      const res = await app.request("/v1/readings", {
        method: "OPTIONS",
        headers: {
          Origin: "http://localhost:8081",
          "Access-Control-Request-Method": "GET",
        },
      });
      expect(res.status).toBe(204);
      expect(res.headers.get("access-control-allow-origin")).toBe("*");
    });

    it("handles unhandled exceptions via onError and returns 500", async () => {
      // Silence console.error for expected test error output
      const originalConsoleError = console.error;
      console.error = () => {};

      try {
        const error = new Error("Simulated unhandled exception");
        const mockContext = {
          json: (data: unknown, status: number) =>
            new Response(JSON.stringify(data), { status }),
          header: () => {},
        };

        const appWithHandler = app as unknown as {
          errorHandler: (err: Error, c: unknown) => Promise<Response>;
        };
        const res = await appWithHandler.errorHandler(error, mockContext);
        expect(res.status).toBe(500);

        const body = (await res.json()) as ApiResponse<never>;
        expect(body.success).toBe(false);
        expect(body.error).toBe("Internal Server Error");
      } finally {
        console.error = originalConsoleError;
      }
    });
  });

  describe("Authors Endpoints (/v1/authors and /authors)", () => {
    it("GET /v1/authors returns default paginated list (limit: 20, offset: 0)", async () => {
      const res = await app.request("/v1/authors");
      expect(res.status).toBe(200);

      const body = (await res.json()) as ApiResponse<
        PaginatedResponse<SeedAuthor>
      >;
      expect(body.success).toBe(true);
      expect(body.data?.items.length).toBeGreaterThan(0);
      expect(body.data?.meta.limit).toBe(20);
      expect(body.data?.meta.offset).toBe(0);
      expect(body.data?.meta.total).toBe(SEED_AUTHORS.length);
      expect(body.data?.meta.hasMore).toBe(false);

      // Verify structure of each author
      const first = body.data?.items[0];
      expect(first?.id).toBeDefined();
      expect(first?.name).toBeDefined();
    });

    it("GET /v1/authors supports custom limit and offset pagination", async () => {
      const res = await app.request("/v1/authors?limit=2&offset=1");
      expect(res.status).toBe(200);

      const body = (await res.json()) as ApiResponse<
        PaginatedResponse<SeedAuthor>
      >;
      expect(body.success).toBe(true);
      expect(body.data?.items.length).toBe(2);
      expect(body.data?.meta.limit).toBe(2);
      expect(body.data?.meta.offset).toBe(1);
      expect(body.data?.meta.hasMore).toBe(true);
      // Items offset 1 should match second item from SEED_AUTHORS
      expect(body.data?.items[0].id).toBe(SEED_AUTHORS[1].id);
    });

    it("GET /v1/authors rejects invalid pagination params with 400 Bad Request", async () => {
      const resNegative = await app.request("/v1/authors?limit=-5");
      expect(resNegative.status).toBe(400);

      const bodyNegative = (await resNegative.json()) as ApiResponse<never>;
      expect(bodyNegative.success).toBe(false);
      expect(bodyNegative.error).toBeDefined();

      const resOverflow = await app.request("/v1/authors?limit=999");
      expect(resOverflow.status).toBe(400);

      const resString = await app.request("/v1/authors?limit=invalid");
      expect(resString.status).toBe(400);
    });

    it("POST /v1/authors creates new author when payload is valid", async () => {
      const uniqueName = `Test Author ${Date.now()}`;
      const res = await app.request("/v1/authors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: uniqueName,
          bio: "Functional test author biography",
        }),
      });
      expect(res.status).toBe(201);

      const body = (await res.json()) as ApiResponse<SeedAuthor>;
      expect(body.success).toBe(true);
      expect(body.data?.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(body.data?.name).toBe(uniqueName);
      expect(body.data?.bio).toBe("Functional test author biography");
    });

    it("POST /v1/authors rejects empty or missing name with 400 Bad Request", async () => {
      const resEmpty = await app.request("/v1/authors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "   ",
        }),
      });
      expect(resEmpty.status).toBe(400);

      const body = (await resEmpty.json()) as ApiResponse<never>;
      expect(body.success).toBe(false);
      expect(body.error).toContain("Author name is required");
    });
  });

  describe("Readings Endpoints (/v1/readings and /readings)", () => {
    it("GET /v1/readings returns default paginated list (limit: 20, offset: 0)", async () => {
      const res = await app.request("/v1/readings");
      expect(res.status).toBe(200);

      const body = (await res.json()) as ApiResponse<
        PaginatedResponse<SeedReading>
      >;
      expect(body.success).toBe(true);
      expect(body.data?.items.length).toBeGreaterThan(0);
      expect(body.data?.meta.limit).toBe(20);
      expect(body.data?.meta.offset).toBe(0);
      expect(body.data?.meta.total).toBeGreaterThanOrEqual(
        SEED_READINGS.length,
      );

      const reading = body.data?.items[0];
      expect(reading?.id).toBeDefined();
      expect(reading?.author_id).toBeDefined();
      expect(reading?.translations.es?.title).toBeDefined();
      expect(reading?.translations.es?.content).toBeDefined();
    });

    it("GET /v1/readings filters by authorId query param", async () => {
      const targetAuthorId = SEED_AUTHOR_IDS.MARCUS_AURELIUS;
      const res = await app.request(
        `/v1/readings?authorId=${targetAuthorId}&limit=10`,
      );
      expect(res.status).toBe(200);

      const body = (await res.json()) as ApiResponse<
        PaginatedResponse<SeedReading>
      >;
      expect(body.success).toBe(true);
      expect(body.data?.items.length).toBeGreaterThan(0);
      for (const item of body.data?.items ?? []) {
        expect(item.author_id).toBe(targetAuthorId);
      }
    });

    it("GET /v1/readings returns empty items array when author has no readings", async () => {
      const res = await app.request(
        "/v1/readings?authorId=non-existent-author-id",
      );
      expect(res.status).toBe(200);

      const body = (await res.json()) as ApiResponse<
        PaginatedResponse<SeedReading>
      >;
      expect(body.success).toBe(true);
      expect(body.data?.items.length).toBe(0);
      expect(body.data?.meta.total).toBe(0);
      expect(body.data?.meta.hasMore).toBe(false);
    });

    it("GET /v1/readings/:id returns reading when found", async () => {
      const targetId = SEED_READINGS[0].id;
      const res = await app.request(`/v1/readings/${targetId}`);
      expect(res.status).toBe(200);

      const body = (await res.json()) as ApiResponse<SeedReading>;
      expect(body.success).toBe(true);
      expect(body.data?.id).toBe(targetId);
      expect(body.data?.author_id).toBe(SEED_READINGS[0].author_id);
    });

    it("GET /v1/readings/:id returns 404 when reading does not exist", async () => {
      const res = await app.request("/v1/readings/non-existent-reading-id");
      expect(res.status).toBe(404);

      const body = (await res.json()) as ApiResponse<never>;
      expect(body.success).toBe(false);
      expect(body.error).toBe("Reading not found");
    });

    it("POST /v1/readings creates reading with spanish translation and optional english translation", async () => {
      const payload = {
        authorId: SEED_AUTHOR_IDS.SENECA,
        translations: {
          es: {
            title: "Sobre la Brevedad de la Vida",
            content: "No es que tengamos poco tiempo, sino que perdemos mucho.",
          },
          en: {
            title: "On the Shortness of Life",
            content:
              "It is not that we have a short time to live, but that we waste a lot of it.",
          },
        },
      };

      const res = await app.request("/v1/readings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      expect(res.status).toBe(201);

      const body = (await res.json()) as ApiResponse<SeedReading>;
      expect(body.success).toBe(true);
      expect(body.data?.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(body.data?.author_id).toBe(SEED_AUTHOR_IDS.SENECA);
      expect(body.data?.translations.es?.title).toBe(
        "Sobre la Brevedad de la Vida",
      );
      expect(body.data?.translations.en?.title).toBe(
        "On the Shortness of Life",
      );
      expect(body.data?.readDates).toEqual([]);

      // Verify it can immediately be fetched by ID
      const createdId = body.data!.id;
      const getRes = await app.request(`/v1/readings/${createdId}`);
      expect(getRes.status).toBe(200);
      const getBody = (await getRes.json()) as ApiResponse<SeedReading>;
      expect(getBody.data?.id).toBe(createdId);
    });

    it("POST /v1/readings rejects payload with empty spanish title or content with 400", async () => {
      const invalidPayloads = [
        // Missing authorId
        {
          authorId: "   ",
          translations: { es: { title: "Title", content: "Content" } },
        },
        // Missing spanish title
        {
          authorId: SEED_AUTHOR_IDS.SENECA,
          translations: { es: { title: "   ", content: "Content" } },
        },
        // Missing spanish content
        {
          authorId: SEED_AUTHOR_IDS.SENECA,
          translations: { es: { title: "Title", content: "   " } },
        },
      ];

      for (const payload of invalidPayloads) {
        const res = await app.request("/v1/readings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        expect(res.status).toBe(400);

        const body = (await res.json()) as ApiResponse<never>;
        expect(body.success).toBe(false);
        expect(body.error).toBeDefined();
      }
    });
  });
});
