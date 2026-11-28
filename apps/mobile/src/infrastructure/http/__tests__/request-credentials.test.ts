import { afterEach, describe, expect, it, mock } from "bun:test";
import { HttpClient } from "../http-client";
// Loaded dynamically, not imported at the top: eslint resolves `../request-credentials`
// to its `.web.ts` twin, so two static imports of the same pair read as duplicates.
async function nativeCredentials(): Promise<RequestCredentials | undefined> {
  return (await import("../request-credentials")).REQUEST_CREDENTIALS;
}

async function webCredentials(): Promise<RequestCredentials | undefined> {
  return (await import("../request-credentials.web")).REQUEST_CREDENTIALS;
}

/**
 * The credential mode the curated-content client runs with (S8, S22, S26).
 *
 * The session transport is chosen per client class: a native client presents
 * `Authorization: Bearer`, a browser presents the `HttpOnly` cookie Better Auth set. The
 * reading client only ever did the first, so on the web target a write issued after a
 * page reload carried no credential at all — the in-memory token is gone with the page —
 * and the admin gate answered 401. These cases pin both halves: the browser asks for its
 * cookie, and native keeps the bearer header it already had.
 */

const SRC_DIR = new URL("../../..", import.meta.url).pathname;
const BASE_URL = "https://api.example.com";

afterEach(() => {
  mock.restore();
});

interface FetchCall {
  url: string;
  init?: RequestInit;
}

/** Captures what the client actually handed to `fetch`. */
function captureFetch(body: unknown = { data: { ok: true } }): FetchCall[] {
  const calls: FetchCall[] = [];
  globalThis.fetch = mock(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), init });
      return new Response(JSON.stringify(body), { status: 200 });
    },
  ) as unknown as typeof fetch;
  return calls;
}

function headersOf(call: FetchCall): Record<string, string> {
  return (call.init?.headers ?? {}) as Record<string, string>;
}

async function sourceOf(relativePath: string): Promise<string> {
  return Bun.file(`${SRC_DIR}${relativePath}`).text();
}

describe("web transport (S22, S26)", () => {
  it("sends the session cookie on a write", async () => {
    // The web build resolves the `include` module, not the native `undefined` one.
    expect(await webCredentials()).toBe("include");

    const calls = captureFetch();
    const client = new HttpClient({
      baseUrl: BASE_URL,
      credentials: await webCredentials(),
      getAuthToken: () => null,
    });

    // A write, because a read is public and would pass without any credential at all.
    await client.post("/v1/readings", { title: "Meditations" });

    expect(calls).toHaveLength(1);
    expect(calls[0]!.init?.credentials).toBe("include");
  });

  it("defaults to the platform module instead of a hard-coded mode", async () => {
    const source = await sourceOf("infrastructure/http/http-client.ts");

    // The default comes from the platform-split module, which is what makes the web
    // bundle ask for credentials while native does not. A hard-coded mode here would
    // apply one client class's transport to the other.
    expect(source).toContain('from "./request-credentials"');
    expect(source).not.toContain('from "./request-credentials.web"');
  });
});

describe("native transport (S8)", () => {
  it("keeps the bearer header and asks for no credentials", async () => {
    expect(await nativeCredentials()).toBeUndefined();

    const calls = captureFetch();
    const client = new HttpClient({
      baseUrl: BASE_URL,
      getAuthToken: () => "native-session-token",
    });

    await client.post("/v1/readings", { title: "Meditations" });

    expect(calls).toHaveLength(1);
    // Native has no cookie jar to present, and its transport is the header.
    expect(calls[0]!.init?.credentials).toBeUndefined();
    expect(headersOf(calls[0]!).Authorization).toBe(
      "Bearer native-session-token",
    );
  });
});

describe("no token is persisted for the web transport (S22)", () => {
  it("touches no browser storage in the credentials module or the client", async () => {
    for (const file of [
      "infrastructure/http/request-credentials.ts",
      "infrastructure/http/request-credentials.web.ts",
      "infrastructure/http/http-client.ts",
    ]) {
      const source = await sourceOf(file);

      expect(source).not.toContain("localStorage");
      expect(source).not.toContain("sessionStorage");
      expect(source).not.toContain("document.cookie");
      expect(source).not.toContain("expo-secure-store");
    }
  });
});
