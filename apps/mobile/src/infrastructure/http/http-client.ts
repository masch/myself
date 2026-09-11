import {
  ApiClientError,
  ApiHttpError,
  ApiNetworkError,
  ApiTimeoutError,
} from "./errors";

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
}

export interface HttpClientConfig {
  baseUrl: string;
  timeoutMs?: number;
  defaultHeaders?: Record<string, string>;
  getAuthToken?: () => Promise<string | null> | string | null;
}

const DEFAULT_TIMEOUT_MS = 10_000;

export class HttpClient {
  readonly baseUrl: string;
  readonly defaultTimeoutMs: number;
  readonly defaultHeaders: Record<string, string>;
  private readonly getAuthToken?: () => Promise<string | null> | string | null;

  constructor(config: HttpClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.defaultTimeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.defaultHeaders = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...config.defaultHeaders,
    };
    this.getAuthToken = config.getAuthToken;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const method = options.method ?? "GET";
    const timeoutMs = options.timeoutMs ?? this.defaultTimeoutMs;

    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...options.headers,
    };

    if (this.getAuthToken) {
      try {
        const token = await this.getAuthToken();
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
      } catch (err) {
        throw new ApiClientError(
          `Failed to acquire authorization token: ${String(err)}`,
        );
      }
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers,
        body:
          options.body !== undefined ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new ApiTimeoutError(timeoutMs);
      }
      throw new ApiNetworkError(
        `Network request to ${url} failed: ${err instanceof Error ? err.message : String(err)}`,
        err,
      );
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      let errorData: unknown;
      try {
        errorData = await res.json();
      } catch {
        // Response wasn't json, ignore parsing error
      }
      throw new ApiHttpError(res.status, res.statusText, errorData);
    }

    // Handle 204 No Content
    if (res.status === 204) {
      return undefined as unknown as T;
    }

    try {
      return (await res.json()) as T;
    } catch (err) {
      throw new ApiClientError(
        `Failed to parse response JSON from ${url}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  get<T>(
    path: string,
    options?: Omit<RequestOptions, "method" | "body">,
  ): Promise<T> {
    return this.request<T>(path, { ...options, method: "GET" });
  }

  post<T>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, "method" | "body">,
  ): Promise<T> {
    return this.request<T>(path, { ...options, method: "POST", body });
  }

  put<T>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, "method" | "body">,
  ): Promise<T> {
    return this.request<T>(path, { ...options, method: "PUT", body });
  }

  delete<T>(
    path: string,
    options?: Omit<RequestOptions, "method" | "body">,
  ): Promise<T> {
    return this.request<T>(path, { ...options, method: "DELETE" });
  }
}
