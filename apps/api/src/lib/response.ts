import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { type ApiResponse, type ErrorCode, HttpStatus } from "@myself/shared";

/**
 * Sends a standard success response conforming to ApiResponse<T>.
 */
export const ok = <T>(
  c: Context,
  data: T,
  status: ContentfulStatusCode = HttpStatus.OK,
) => c.json<ApiResponse<T>>({ success: true, data }, status);

/**
 * Sends a standard error response conforming to ApiResponse<never>.
 * Accepts an optional machine-readable business ErrorCode for frontend UI consumption.
 */
export const fail = (
  c: Context,
  error: string,
  status: ContentfulStatusCode = HttpStatus.BAD_REQUEST,
  code?: ErrorCode,
) => c.json<ApiResponse<never>>({ success: false, error, code }, status);
