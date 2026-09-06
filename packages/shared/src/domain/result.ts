import type { ErrorCode } from "../constants/errors";

export class DomainError extends Error {
  public readonly code: ErrorCode;

  constructor(message: string, code: ErrorCode) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export type Result<T, E = Error> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export const Result = {
  ok<T>(value: T): Result<T, never> {
    return { ok: true, value };
  },
  fail<E = Error>(error: E): Result<never, E> {
    return { ok: false, error };
  },
};
