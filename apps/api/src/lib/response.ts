import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { ApiResponse } from "@myself/shared";

/**
 * Sends a standard success response conforming to ApiResponse<T>.
 */
export const ok = <T>(
  c: Context,
  data: T,
  status: ContentfulStatusCode = 200,
) => c.json<ApiResponse<T>>({ success: true, data }, status);

/**
 * Sends a standard error response conforming to ApiResponse<never>.
 */
export const fail = (
  c: Context,
  error: string,
  status: ContentfulStatusCode = 400,
) => c.json<ApiResponse<never>>({ success: false, error }, status);
