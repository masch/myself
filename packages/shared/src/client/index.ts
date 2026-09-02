import { hc } from "hono/client";

/**
 * Re-export hc and Client type from hono/client for strongly-typed RPC consumers.
 *
 * Usage:
 * ```ts
 * import type { AppType } from "@myself/api";
 * import { hc } from "@myself/shared";
 *
 * const client = hc<AppType>("https://api.myself.dev");
 * const res = await client.readings.$get();
 * const { data } = await res.json();
 * ```
 */
export { hc, hc as createApiClient };
export type { ClientRequestOptions } from "hono/client";
