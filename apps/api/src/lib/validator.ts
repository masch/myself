import type { Hook } from "@hono/zod-openapi";
import { type ApiErrorResponse, ErrorCode, HttpStatus } from "@myself/shared";

/**
 * Standard validation failure hook for OpenAPIHono routes.
 * Produces unified ApiErrorResponse with BAD_REQUEST code and 400 HTTP status.
 */
export const defaultHook: Hook<any, any, any, any> = (result, c) => {
  if (!result.success) {
    const errorResponse: ApiErrorResponse = {
      error: result.error.issues[0]?.message ?? "Validation failed",
      code: ErrorCode.BAD_REQUEST,
    };
    return c.json(errorResponse, HttpStatus.BAD_REQUEST);
  }
};
