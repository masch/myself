# Exploration: Encapsulate Frontend REST API Client in Dedicated Library

- **Change**: `frontend-api-client-lib`
- **Execution Mode**: `interactive`
- **Artifact Store**: `hybrid` (OpenSpec + Engram)
- **Delivery Strategy**: `single-pr`

---

## 1. Current State & Architecture

Currently in `apps/mobile`:

1. `HttpReadingApiAdapter` (`apps/mobile/src/features/readings/infrastructure/http-reading-api.adapter.ts`) performs REST calls (`fetchReadings`, `postReading`, `putReading`, `deleteReading`, `postAuthor`) via raw `fetch` against `${baseUrl}/v1/...`.
2. While `this.client = createApiClient(baseUrl)` is initialized from `@myself/shared`, it is underutilized: endpoints are called with manual string concatenation, ad-hoc header configuration, separate AbortSignal timeouts, and disconnected error handling (`console.warn`).
3. If new feature modules in mobile or web (e.g. `users`, `authors`, `tasks`) require API integration, each would duplicate HTTP boilerplate and error-mapping patterns.
4. In `packages/shared/src/client/index.ts`, only a re-export of Hono's `hc` RPC client currently exists:
   ```ts
   export { hc, hc as createApiClient };
   ```
   However, `apps/mobile` does not import `AppType` from `@myself/api` to maintain decoupling between mobile and backend codebases.

## 2. Affected Areas

- `packages/shared/src/client/`: Centralized typed HTTP transport client, domain endpoint resources, error normalization, and DTO parsing.
- `apps/mobile/src/features/readings/infrastructure/http-reading-api.adapter.ts`: Delegate network transport concerns to the new API client.
- `apps/mobile/src/core/sync/sync-engine.ts`: Uses `HttpReadingApiAdapter`, benefiting from normalized error types.

## 3. Approaches Considered

### Option A: Extend `@myself/shared/client` with an HTTP Client SDK

- Implement a dedicated API client wrapper inside `packages/shared/src/client/` (e.g. `ApiClient` class exposing modular sub-clients: `readings`, `authors`, `users`, `system`).
- Reuse existing shared Zod schemas (`packages/shared/src/schemas`) and DTOs (`ReadingDto`, `AuthorDto`).
- Introduce a structured error hierarchy (`ApiClientError`, `ApiHttpError`, `ApiNetworkError`, `ApiTimeoutError`).
- **Pros:**
  - Zero monorepo configuration overhead (no new workspace package).
  - Already linked and consumed by `apps/mobile` and `apps/api`.
  - Reuses all existing domain types.
- **Cons:**
  - Keeps HTTP client logic in `@myself/shared`.
- **Effort**: Low to Medium.

### Option B: Create a standalone `packages/api-client` package

- Standalone workspace package `@myself/api-client`.
- **Pros**: Strict isolation of networking concerns from domain models.
- **Cons**: Overhead of creating new package configurations, build scripts, and workspace links.
- **Effort**: Medium.

## 4. Recommendation

**Option A (Extend `@myself/shared/client`)**:

- Create `ApiClient` with modular endpoint resources (`api.readings`, `api.authors`, etc.).
- Centralize `fetch`, timeout handling (`AbortSignal.timeout`), base URL, and headers.
- Normalize backend errors into typed `ApiClientError` subclasses.

## 5. Risks & Mitigation

- **Risk**: Serialization or schema mismatch affecting reading sync.  
  **Mitigation**: Validate request/response types against existing `@myself/shared` schemas and run mobile tests.
- **Risk**: Network timeout behavior in React Native runtime.  
  **Mitigation**: Provide safe fallback for `AbortSignal.timeout`.

## 6. Ready for Proposal

Yes. The scope, boundaries, and technical direction are well understood.
