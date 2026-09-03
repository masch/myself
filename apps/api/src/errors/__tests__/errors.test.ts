import { describe, expect, it } from "bun:test";
import { Hono } from "hono";
import { ErrorCode, HttpStatus, type ApiResponse } from "@myself/shared";
import type { AppEnv } from "../../types";
import {
  BadRequestError,
  ConflictError,
  EntityNotFoundError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  UserConflictError,
  handleApiError,
} from "../index";

describe("apps/api/src/errors Unit Tests", () => {
  it("instantiates AppError hierarchy classes with correct status codes and ErrorCodes", () => {
    const notFound = new NotFoundError("Resource missing");
    expect(notFound.status).toBe(HttpStatus.NOT_FOUND);
    expect(notFound.code).toBe(ErrorCode.NOT_FOUND);
    expect(notFound.message).toBe("Resource missing");
    expect(notFound.name).toBe("NotFoundError");

    const conflict = new ConflictError("Conflict detected");
    expect(conflict.status).toBe(HttpStatus.CONFLICT);
    expect(conflict.code).toBe(ErrorCode.CONFLICT);

    const badReq = new BadRequestError("Bad request");
    expect(badReq.status).toBe(HttpStatus.BAD_REQUEST);
    expect(badReq.code).toBe(ErrorCode.BAD_REQUEST);

    const unauth = new UnauthorizedError("Unauthorized");
    expect(unauth.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(unauth.code).toBe(ErrorCode.UNAUTHORIZED);

    const forbidden = new ForbiddenError("Forbidden");
    expect(forbidden.status).toBe(HttpStatus.FORBIDDEN);
    expect(forbidden.code).toBe(ErrorCode.FORBIDDEN);

    const userConflict = new UserConflictError("test@example.com");
    expect(userConflict.status).toBe(HttpStatus.CONFLICT);
    expect(userConflict.code).toBe(ErrorCode.USER_ALREADY_EXISTS);
    expect(userConflict.message).toContain("test@example.com");

    const entityNotFound = new EntityNotFoundError("User", "u1");
    expect(entityNotFound.status).toBe(HttpStatus.NOT_FOUND);
    expect(entityNotFound.code).toBe(ErrorCode.ENTITY_NOT_FOUND);
    expect(entityNotFound.message).toContain('User with id "u1" not found');
  });

  it("handleApiError formats AppError with status, message, and machine-readable code", async () => {
    const app = new Hono<AppEnv>()
      .onError(handleApiError)
      .get("/user-conflict", () => {
        throw new UserConflictError("dup@example.com");
      });

    const res = await app.request("/user-conflict");
    expect(res.status).toBe(HttpStatus.CONFLICT);

    const body = (await res.json()) as ApiResponse<never>;
    expect(body.success).toBe(false);
    expect(body.error).toContain("dup@example.com");
    expect(body.code).toBe(ErrorCode.USER_ALREADY_EXISTS);
  });

  it("handleApiError formats generic unexpected errors with 500 and INTERNAL_ERROR code", async () => {
    const app = new Hono<AppEnv>().onError(handleApiError).get("/crash", () => {
      throw new Error("Unexpected crash");
    });

    const res = await app.request("/crash");
    expect(res.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);

    const body = (await res.json()) as ApiResponse<never>;
    expect(body.success).toBe(false);
    expect(body.error).toBe("Internal Server Error");
    expect(body.code).toBe(ErrorCode.INTERNAL_ERROR);
  });
});
