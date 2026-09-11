export class ApiClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiClientError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ApiHttpError extends ApiClientError {
  readonly status: number;
  readonly statusText: string;
  readonly data?: unknown;

  constructor(status: number, statusText: string, data?: unknown) {
    super(`HTTP Error ${status}: ${statusText}`);
    this.name = "ApiHttpError";
    this.status = status;
    this.statusText = statusText;
    this.data = data;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ApiNetworkError extends ApiClientError {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "ApiNetworkError";
    this.cause = cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ApiTimeoutError extends ApiClientError {
  readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms`);
    this.name = "ApiTimeoutError";
    this.timeoutMs = timeoutMs;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
