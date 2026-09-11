import type { ErrorHandlerPort } from "@myself/shared";

export class MobileErrorHandler implements ErrorHandlerPort {
  handle(error: unknown, context?: Record<string, unknown>): void {
    const message =
      error instanceof Error ? error.message : String(error ?? "Unknown error");

    // Unified telemetry / diagnostic logging
    if (__DEV__) {
      console.error("[MobileErrorHandler]", message, {
        error,
        context,
      });
    }
  }
}

export const appErrorHandler = new MobileErrorHandler();
