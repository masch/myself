# Design: Frontend REST API Client Library

## Technical Approach

We will implement a typed REST API client library in `packages/shared/src/client/`. This library encapsulates raw HTTP network handling, request timeout management, header configurations, and error normalization. High-level adapters in `apps/mobile` (such as `HttpReadingApiAdapter`) will delegate network calls to this client, while keeping their existing domain translation and mapping logic intact.

## Architecture Decisions

### Decision 1: Modular Resource Hierarchy

**Choice**: `ApiClient` aggregates modular resource sub-clients (`api.readings`, `api.authors`, `api.users`, `api.system`).  
**Alternatives considered**: Monolithic client with flat methods (`api.getReadings()`, `api.createAuthor()`).  
**Rationale**: Mirrors backend route structures (`/v1/readings`, `/v1/authors`), providing clear boundaries as more endpoints are added.

### Decision 2: Standardized Error Classes

**Choice**: Explicit error classes extending a base `ApiClientError` (`ApiHttpError`, `ApiNetworkError`, `ApiTimeoutError`).  
**Alternatives considered**: Generic JavaScript `Error` or passing raw `Response` instances.  
**Rationale**: Allows calling code to cleanly differentiate between network-level timeouts (retryable) and HTTP 4xx validation failures (non-retryable).

### Decision 3: Shared DTO and Schema Integration

**Choice**: Reuse `@myself/shared` Zod schemas and DTOs (`ReadingDto`, `AuthorDto`, `CreateReadingInput`).  
**Alternatives considered**: Duplicate DTO definitions inside mobile.  
**Rationale**: Preserves `@myself/shared` as the Single Source of Truth across full-stack applications.

## Data Flow

```
[UI Screen: Meditation / Readings]
        │
[useReadings Application Hook]
        │
[IReadingRepository Port]
        │
[HttpReadingApiAdapter] (apps/mobile)
        │
  [ApiClient] (packages/shared/src/client)
   ├── [HttpClient] (Fetch, Timeout, Headers)
   └── [ReadingsClient] / [AuthorsClient]
        │
[Backend REST API (apps/api)]
```

## File Changes

| File                                                                           | Action | Description                                                               |
| ------------------------------------------------------------------------------ | ------ | ------------------------------------------------------------------------- |
| `packages/shared/src/client/errors.ts`                                         | Create | `ApiClientError`, `ApiHttpError`, `ApiNetworkError`, `ApiTimeoutError`    |
| `packages/shared/src/client/http-client.ts`                                    | Create | Typed HTTP wrapper over native `fetch` with timeout and status validation |
| `packages/shared/src/client/resources/readings.client.ts`                      | Create | Sub-client for `/v1/readings` endpoints                                   |
| `packages/shared/src/client/resources/authors.client.ts`                       | Create | Sub-client for `/v1/authors` endpoints                                    |
| `packages/shared/src/client/api-client.ts`                                     | Create | Root `ApiClient` class exposing resource sub-clients                      |
| `packages/shared/src/client/index.ts`                                          | Modify | Re-export `ApiClient`, error types, and `createApiClient` factory         |
| `packages/shared/src/client/__tests__/api-client.test.ts`                      | Create | Unit tests for client transport, timeouts, and error normalization        |
| `apps/mobile/src/features/readings/infrastructure/http-reading-api.adapter.ts` | Modify | Delegate REST calls to `api.readings` and `api.authors`                   |

## Interfaces / Contracts

```ts
export interface ApiClientConfig {
  baseUrl: string;
  timeoutMs?: number;
  headers?: Record<string, string>;
  getAuthToken?: () => Promise<string | null> | string | null;
}

export class ApiClient {
  readonly readings: ReadingsClient;
  readonly authors: AuthorsClient;
  constructor(config: ApiClientConfig);
}
```

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Testing Strategy

| Layer       | What to Test                                            | Approach                                                          |
| ----------- | ------------------------------------------------------- | ----------------------------------------------------------------- |
| Unit        | Request execution & status validation                   | Mock `fetch` responses in `packages/shared/src/client/__tests__/` |
| Unit        | Timeout handling (`ApiTimeoutError`)                    | Simulate delayed fetch with AbortSignal                           |
| Unit        | Error normalization (`ApiHttpError`, `ApiNetworkError`) | Simulate 404, 500 responses and connection failures               |
| Integration | `HttpReadingApiAdapter` mapping with `ApiClient`        | Existing adapter unit tests in `apps/mobile`                      |

## Open Questions

None.
