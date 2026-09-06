export interface ErrorHandlerPort {
  handle(error: unknown, context?: Record<string, unknown>): void;
}
