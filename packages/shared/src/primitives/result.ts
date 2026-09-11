export type Result<T, E = Error> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export const Result = {
  ok<T>(value: T): Result<T, never> {
    return { ok: true, value };
  },

  err<E>(error: E): Result<never, E> {
    return { ok: false, error };
  },

  isOk<T, E>(
    result: Result<T, E>,
  ): result is { readonly ok: true; readonly value: T } {
    return result.ok;
  },

  isErr<T, E>(
    result: Result<T, E>,
  ): result is { readonly ok: false; readonly error: E } {
    return !result.ok;
  },
} as const;
