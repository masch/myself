import type { ErrorHandlerPort } from "@myself/shared";
import { appErrorHandler } from "./mobile-error-handler";

/**
 * Safely executes a promise in the background (fire-and-forget),
 * routing any unhandled rejections to the central error handler
 * with contextual telemetry.
 */
export function safeAsync<T>(
  promise: Promise<T>,
  context?: Record<string, unknown>,
  handler: ErrorHandlerPort = appErrorHandler,
): void {
  promise.catch((error: unknown) => {
    handler.handle(error, context);
  });
}
