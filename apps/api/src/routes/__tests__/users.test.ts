import { beforeAll, describe, expect, it } from "bun:test";
import { Hono } from "hono";
import {
  ErrorCode,
  DateTime,
  type PaginatedResponse,
  type UserDto,
} from "@myself/shared";
import type { AppEnv } from "../../types";
import type { RepositoriesDependencies } from "../../middleware/repositories";
import { repositoriesMiddleware } from "../../middleware/repositories";
import { createTestRepositories } from "../../db/test-db";
import { handleApiError } from "../../errors";
import { User as UserDomain } from "../../domain";
import { usersRoute } from "../users";

describe("Users API Endpoints E2E Tests (HTTP -> SQLite Database)", () => {
  let app: Hono<AppEnv>;
  let repos: RepositoriesDependencies;

  beforeAll(async () => {
    repos = await createTestRepositories({ seed: false });
    app = new Hono<AppEnv>()
      .use("*", repositoriesMiddleware(repos))
      .onError(handleApiError)
      .route("/users", usersRoute);
  });

  it("isolates users sub-router and returns paginated list", async () => {
    const res = await app.request("/users");
    expect(res.status).toBe(200);

    const body = (await res.json()) as PaginatedResponse<UserDto>;
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.meta.limit).toBe(20);
    expect(body.meta.offset).toBe(0);
  });

  it("creates a new user and retrieves it by id", async () => {
    const payload = {
      name: "Marcus Aurelius",
      email: "marcus@rome.gov",
      avatarUrl: "https://example.com/marcus.png",
    };

    const createRes = await app.request("/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    expect(createRes.status).toBe(201);

    const createBody = (await createRes.json()) as UserDto;
    expect(createBody.id).toBeDefined();
    expect(createBody.name).toBe("Marcus Aurelius");
    expect(createBody.email).toBe("marcus@rome.gov");
    expect(createBody.avatar_url).toBe("https://example.com/marcus.png");

    const getRes = await app.request(`/users/${createBody.id}`);
    expect(getRes.status).toBe(200);
    const getBody = (await getRes.json()) as UserDto;
    expect(getBody.id).toBe(createBody.id);

    // Verify directly in the SQLite database that the row was persisted:
    const persisted = await repos.userRepo.findById(createBody.id);
    expect(persisted).not.toBeNull();
    expect(persisted?.email).toBe("marcus@rome.gov");
  });

  it("rejects creating user with duplicate email with 409 Conflict", async () => {
    const existing = await repos.userRepo.findByEmail("marcus@rome.gov");
    if (!existing) {
      await repos.userRepo.create(
        new UserDomain({
          id: "a0000000-0000-4000-8000-000000000001" as any,
          name: "Marcus Aurelius",
          email: "marcus@rome.gov",
          createdAt: DateTime.now(),
        }),
      );
    }

    const payload = {
      name: "Duplicate Marcus",
      email: "marcus@rome.gov",
    };

    const res = await app.request("/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    expect(res.status).toBe(409);

    const body = (await res.json()) as { error: string; code: string };
    expect(body.error).toContain("already exists");
    expect(body.code).toBe(ErrorCode.USER_ALREADY_EXISTS);
  });

  it("returns 404 when user id is not found", async () => {
    const res = await app.request(
      "/users/00000000-0000-4000-8000-000000000000",
    );
    expect(res.status).toBe(404);

    const body = (await res.json()) as { error: string; code: string };
    expect(body.error).toBe("User not found");
    expect(body.code).toBe(ErrorCode.ENTITY_NOT_FOUND);
  });

  it("rejects invalid user id format with 400 Bad Request via param guard", async () => {
    const res = await app.request("/users/not-a-valid-uuid");
    expect(res.status).toBe(400);

    const body = (await res.json()) as { error: string; code: string };
    expect(body.error).toBe("Invalid ID format");
    expect(body.code).toBe(ErrorCode.BAD_REQUEST);
  });

  it("rejects invalid email with 400 Bad Request", async () => {
    const res = await app.request("/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Invalid", email: "not-an-email" }),
    });
    expect(res.status).toBe(400);

    const body = (await res.json()) as { error: string; code: string };
    expect(body.code).toBe(ErrorCode.BAD_REQUEST);
  });

  it("bubbles unexpected repository errors with 500", async () => {
    const errorApp = new Hono<AppEnv>()
      .use("*", async (c, next) => {
        c.set("userRepo", {
          list: async () => ({ items: [], total: 0 }),
          findById: async () => null,
          findByEmail: async () => null,
          create: async () => {
            throw new Error("Fatal DB Error");
          },
        } as any);
        await next();
      })
      .onError(handleApiError)
      .route("/users", usersRoute);

    const res = await errorApp.request("/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "User", email: "user@example.com" }),
    });

    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string; code: string };
    expect(body.code).toBe(ErrorCode.INTERNAL_ERROR);
  });
});
