import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import {
  type ApiErrorResponse,
  type ErrorCode,
  HttpStatus,
} from "@myself/shared";

/**
 * Sends a standard success response directly with data.
 */
export const ok = <T>(
  c: Context,
  data: T,
  status: ContentfulStatusCode = HttpStatus.OK,
) => c.json<T>(data, status);

/**
 * Sends a standard error response conforming to ApiErrorResponse.
 * Accepts an optional machine-readable business ErrorCode for frontend UI consumption.
 */
export const fail = (
  c: Context,
  error: string,
  status: ContentfulStatusCode = HttpStatus.BAD_REQUEST,
  code?: ErrorCode,
) => c.json<ApiErrorResponse>({ error, code }, status);
