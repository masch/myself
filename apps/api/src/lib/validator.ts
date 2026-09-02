import { zValidator } from "@hono/zod-validator";
import type { ApiResponse } from "@myself/shared";

/**
 * Validates request body JSON against a Zod schema.
 */
export const validatedJson = <T extends Parameters<typeof zValidator>[1]>(
  schema: T,
) =>
  zValidator("json", schema, (result, c) => {
    if (!result.success) {
      const errorResponse: ApiResponse<never> = {
        success: false,
        error: result.error.issues[0]?.message ?? "Validation failed",
      };
      return c.json(errorResponse, 400);
    }
  });

/**
 * Validates request query parameters against a Zod schema.
 */
export const validatedQuery = <T extends Parameters<typeof zValidator>[1]>(
  schema: T,
) =>
  zValidator("query", schema, (result, c) => {
    if (!result.success) {
      const errorResponse: ApiResponse<never> = {
        success: false,
        error: result.error.issues[0]?.message ?? "Invalid query parameters",
      };
      return c.json(errorResponse, 400);
    }
  });
