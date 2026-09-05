import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { ErrorCode, HttpStatus } from "@myself/shared";
import type { AppEnv } from "../types";
import { fail } from "../lib/response";

/**
 * Base abstract class for all application/domain errors.
 * Encapsulates the HTTP status code, machine-readable business ErrorCode, and message.
 */
export abstract class AppError extends Error {
  abstract readonly status: ContentfulStatusCode;
  abstract readonly code: ErrorCode;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends AppError {
  readonly status = HttpStatus.NOT_FOUND;
  readonly code: ErrorCode = ErrorCode.NOT_FOUND;

  constructor(message: string, code: ErrorCode = ErrorCode.NOT_FOUND) {
    super(message);
    this.code = code;
  }
}

export class ConflictError extends AppError {
  readonly status = HttpStatus.CONFLICT;
  readonly code: ErrorCode = ErrorCode.CONFLICT;

  constructor(message: string, code: ErrorCode = ErrorCode.CONFLICT) {
    super(message);
    this.code = code;
  }
}

export class BadRequestError extends AppError {
  readonly status = HttpStatus.BAD_REQUEST;
  readonly code: ErrorCode = ErrorCode.BAD_REQUEST;

  constructor(message: string, code: ErrorCode = ErrorCode.BAD_REQUEST) {
    super(message);
    this.code = code;
  }
}

export class UnauthorizedError extends AppError {
  readonly status = HttpStatus.UNAUTHORIZED;
  readonly code: ErrorCode = ErrorCode.UNAUTHORIZED;

  constructor(message: string, code: ErrorCode = ErrorCode.UNAUTHORIZED) {
    super(message);
    this.code = code;
  }
}

export class ForbiddenError extends AppError {
  readonly status = HttpStatus.FORBIDDEN;
  readonly code: ErrorCode = ErrorCode.FORBIDDEN;

  constructor(message: string, code: ErrorCode = ErrorCode.FORBIDDEN) {
    super(message);
    this.code = code;
  }
}

// Domain-Specific Errors
export class UserConflictError extends ConflictError {
  override readonly code = ErrorCode.USER_ALREADY_EXISTS;

  constructor(email: string) {
    super(
      `User with email "${email}" already exists`,
      ErrorCode.USER_ALREADY_EXISTS,
    );
  }
}

export class EntityNotFoundError extends NotFoundError {
  override readonly code = ErrorCode.ENTITY_NOT_FOUND;

  constructor(entity: string, id: string) {
    super(`${entity} with id "${id}" not found`, ErrorCode.ENTITY_NOT_FOUND);
  }
}

/**
 * Global API Error Handler for Hono.
 * Automatically maps AppError instances to structured ApiResponse format with machine-readable code.
 */
export function handleApiError(err: unknown, c: Context<AppEnv>) {
  if (err instanceof AppError) {
    return fail(c, err.message, err.status, err.code);
  }

  console.error("Unhandled API Error:", err);
  return fail(
    c,
    "Internal Server Error",
    HttpStatus.INTERNAL_SERVER_ERROR,
    ErrorCode.INTERNAL_ERROR,
  );
}
