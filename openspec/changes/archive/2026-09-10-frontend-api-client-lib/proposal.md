# Proposal: Frontend REST API Client Library

## Intent

The mobile application (`apps/mobile`) currently interacts with backend REST endpoints (`apps/api`) via low-level `fetch` calls scattered in infrastructure adapters such as `HttpReadingApiAdapter`. Each adapter manually handles endpoint URL strings, headers, timeouts, and JSON parsing.

We need a dedicated, type-safe API client library in `@myself/shared/client` that encapsulates:

1. HTTP transport orchestration (timeouts, headers, status checking).
2. Domain error normalization (`ApiClientError` hierarchy).
3. Modular resource sub-clients (`readings`, `authors`, `users`, `system`).
4. Reusable typing backed by shared Zod schemas and DTOs.

## Scope

### In Scope

- **HTTP Transport (`HttpClient`)**: Core client handling base URL, timeouts via `AbortSignal`, default headers, and JSON serialization.
- **Error Hierarchy**: Normalized error classes (`ApiClientError`, `ApiHttpError`, `ApiNetworkError`, `ApiTimeoutError`).
- **Resource Clients**: Modular endpoint handlers (`ReadingsClient`, `AuthorsClient`, `UsersClient`, `SystemClient`).
- **Mobile Adapter Integration**: Refactor `HttpReadingApiAdapter` to delegate REST operations to `ApiClient`.
- **Unit Testing**: Comprehensive unit test suite in `@myself/shared` covering all methods, errors, and timeouts.

### Out of Scope

- Backend route modifications in `apps/api`.
- Offline SQLite outbox synchronization logic (only remote transport is updated).

## Capabilities

### New Capabilities

- `frontend-api-client-lib`: Provides a centralized, strongly typed HTTP client with resource sub-clients and error normalization.

### Modified Capabilities

- None.

## Approach

1. Build client infrastructure in `packages/shared/src/client/`:
   - `errors.ts`: Standard error hierarchy.
   - `http-client.ts`: Core transport wrapper around native `fetch`.
   - `resources/`: Modular endpoint implementations.
   - `api-client.ts`: Root client assembling resource modules.
   - `index.ts`: Re-export `ApiClient` and `createApiClient` factory.
2. Refactor `HttpReadingApiAdapter` in `apps/mobile` to consume `ApiClient`.
3. Verify via unit tests in `packages/shared` and `apps/mobile`.

## Affected Areas

| Area                                                                           | Impact         | Description                                                 |
| ------------------------------------------------------------------------------ | -------------- | ----------------------------------------------------------- |
| `packages/shared/src/client/`                                                  | Modified / New | API client classes, error definitions, and resource modules |
| `packages/shared/src/index.ts`                                                 | Modified       | Export new client types and factories                       |
| `apps/mobile/src/features/readings/infrastructure/http-reading-api.adapter.ts` | Modified       | Delegate to `ApiClient`                                     |

## Risks

| Risk                                          | Likelihood | Mitigation                                          |
| --------------------------------------------- | ---------- | --------------------------------------------------- |
| Response payload mismatch breaks sync         | Low        | Reuse existing shared response DTOs and Zod schemas |
| React Native fetch abort signal compatibility | Low        | Standard `AbortSignal.timeout` with fallback        |

## Rollback Plan

Revert `HttpReadingApiAdapter` to legacy fetch calls; new client exports in `@myself/shared` are additive and non-breaking.

## Dependencies

- Native `fetch` (no external runtime dependencies).

## Success Criteria

- [ ] All mobile REST endpoint interactions route through `ApiClient`.
- [ ] Zero raw `fetch()` calls or manual URL path concatenations in `HttpReadingApiAdapter`.
- [ ] HTTP/network failures normalize into typed `ApiClientError` subclasses.
- [ ] All unit tests pass across `@myself/shared` and `apps/mobile` (`make check-tests`).
