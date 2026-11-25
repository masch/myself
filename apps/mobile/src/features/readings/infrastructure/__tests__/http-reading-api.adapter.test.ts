import { afterEach, describe, expect, it, mock } from "bun:test";
import type { EntityId } from "@myself/shared";
import { HttpReadingApiAdapter } from "../http-reading-api.adapter";

/**
 * The readings adapter is the only place the curated-content HTTP client is built
 * (S8), so this is where the bearer token has to arrive: without it every
 * `POST/PUT/DELETE /v1/readings` and `POST /v1/authors` is answered with 401 by the
 * admin gate that landed in T3.
 */
function stubFetch() {
  const calls: { url: string; init?: RequestInit }[] = [];
  globalThis.fetch = mock(async (url: unknown, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify({ data: { id: "created-id" } }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  }) as unknown as typeof fetch;
  return calls;
}

function authHeaderOf(call: { init?: RequestInit }): string | undefined {
  const headers = (call.init?.headers ?? {}) as Record<string, string>;
  return headers["Authorization"] ?? headers["authorization"];
}

const BASE_URL = "https://api.example.com";

describe("HttpReadingApiAdapter bearer wiring (S8)", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    mock.restore();
  });

  it("sends the session token as Authorization: Bearer on every curated write", async () => {
    const calls = stubFetch();
    const adapter = new HttpReadingApiAdapter(
      BASE_URL,
      async () => "session-token",
    );

    await adapter.postAuthor({ name: "Author" });
    await adapter.postReading({
      authorId: "a-1" as EntityId,
      translations: { es: { title: "T", content: "C" } },
    } as never);
    await adapter.putReading("r-1", {
      translations: { es: { title: "T2", content: "C2" } },
    });
    await adapter.deleteReading("r-1");

    expect(calls.length).toBe(4);
    for (const call of calls) {
      expect(authHeaderOf(call)).toBe("Bearer session-token");
    }
  });

  it("sends no Authorization header when the client has no session", async () => {
    const calls = stubFetch();
    const adapter = new HttpReadingApiAdapter(BASE_URL, async () => null);

    await adapter.postAuthor({ name: "Author" });

    expect(calls.length).toBe(1);
    expect(authHeaderOf(calls[0])).toBeUndefined();
  });

  it("reads the token per request, so a sign-in mid-session takes effect", async () => {
    const calls = stubFetch();
    let token: string | null = null;
    const adapter = new HttpReadingApiAdapter(BASE_URL, async () => token);

    await adapter.postAuthor({ name: "Anonymous" });
    token = "fresh-token";
    await adapter.postAuthor({ name: "Signed in" });

    expect(authHeaderOf(calls[0])).toBeUndefined();
    expect(authHeaderOf(calls[1])).toBe("Bearer fresh-token");
  });
});
