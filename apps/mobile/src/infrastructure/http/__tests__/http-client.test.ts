import { describe, it, expect, mock, beforeEach } from "bun:test";
import { HttpClient } from "../http-client";
import {
  ApiClientError,
  ApiHttpError,
  ApiNetworkError,
  ApiTimeoutError,
} from "../errors";

describe("Mobile HttpClient", () => {
  const baseUrl = "https://api.example.com";

  beforeEach(() => {
    mock.restore();
  });

  it("should make a successful GET request", async () => {
    globalThis.fetch = mock(
      async () =>
        new Response(JSON.stringify({ ok: true, data: "test" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    ) as unknown as typeof fetch;

    const client = new HttpClient({ baseUrl });
    const res = await client.get<{ ok: boolean; data: string }>("/v1/test");

    expect(res).toEqual({ ok: true, data: "test" });
  });

  it("should send JSON body and correct headers on POST", async () => {
    let capturedReq: { body?: string; headers?: Headers } = {};

    globalThis.fetch = mock(
      async (_url: string | URL | Request, init?: RequestInit) => {
        capturedReq.body = init?.body as string;
        return new Response(JSON.stringify({ created: true }), { status: 201 });
      },
    ) as unknown as typeof fetch;

    const client = new HttpClient({ baseUrl });
    await client.post("/v1/items", { name: "item-1" });

    expect(capturedReq.body).toBe(JSON.stringify({ name: "item-1" }));
  });

  it("should handle 204 No Content response", async () => {
    globalThis.fetch = mock(
      async () => new Response(null, { status: 204, statusText: "No Content" }),
    ) as unknown as typeof fetch;

    const client = new HttpClient({ baseUrl });
    const res = await client.delete("/v1/items/123");

    expect(res).toBeUndefined();
  });

  it("should throw ApiClientError when request body serialization fails", async () => {
    const client = new HttpClient({ baseUrl });
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    expect(client.post("/v1/items", circular)).rejects.toThrow(ApiClientError);
  });

  it("should throw ApiHttpError on 4xx/5xx responses with parsed error data", async () => {
    globalThis.fetch = mock(
      async () =>
        new Response(
          JSON.stringify({ error: "Not Found", message: "Item missing" }),
          {
            status: 404,
            statusText: "Not Found",
          },
        ),
    ) as unknown as typeof fetch;

    const client = new HttpClient({ baseUrl });

    expect(client.get("/v1/items/999")).rejects.toThrow(ApiHttpError);
    try {
      await client.get("/v1/items/999");
    } catch (err) {
      const httpErr = err as ApiHttpError;
      expect(httpErr.status).toBe(404);
      expect(httpErr.data).toEqual({
        error: "Not Found",
        message: "Item missing",
      });
    }
  });

  it("should throw ApiTimeoutError when request aborts due to timeout", async () => {
    globalThis.fetch = mock(
      async (_url: string | URL | Request, init?: RequestInit) => {
        const signal = init?.signal;
        return new Promise((_, reject) => {
          if (signal) {
            signal.addEventListener("abort", () => {
              const err = new Error("The operation was aborted");
              err.name = "AbortError";
              reject(err);
            });
          }
        });
      },
    ) as unknown as typeof fetch;

    const client = new HttpClient({ baseUrl, timeoutMs: 50 });
    expect(client.get("/v1/slow")).rejects.toThrow(ApiTimeoutError);
  });

  it("should throw ApiTimeoutError when body stream aborts during json parsing", async () => {
    globalThis.fetch = mock(
      async () =>
        ({
          ok: true,
          status: 200,
          statusText: "OK",
          json: async () => {
            const err = new Error("The operation was aborted");
            err.name = "AbortError";
            throw err;
          },
        }) as unknown as Response,
    ) as unknown as typeof fetch;

    const client = new HttpClient({ baseUrl });
    expect(client.get("/v1/stalled-body")).rejects.toThrow(ApiTimeoutError);
  });

  it("should throw ApiNetworkError on connection failures", async () => {
    globalThis.fetch = mock(async () => {
      throw new TypeError("Failed to fetch (network disconnected)");
    }) as unknown as typeof fetch;

    const client = new HttpClient({ baseUrl });
    expect(client.get("/v1/offline")).rejects.toThrow(ApiNetworkError);
  });
});
