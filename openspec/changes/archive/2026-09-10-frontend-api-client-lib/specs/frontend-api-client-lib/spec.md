# Frontend API Client Library Specification

## Purpose

Provides a type-safe, centralized HTTP client abstraction for frontend applications (`apps/mobile` and future web/consumers) to interact with backend REST services, eliminating repetitive manual fetch logic, normalizing error handling, and isolating networking transport details.

## Requirements

### Requirement: Unified HTTP Transport Client

The library SHALL provide a base `HttpClient` encapsulating request execution, timeout management, default JSON headers, and HTTP status verification.

#### Scenario: Successful request execution

- GIVEN a valid backend base URL and endpoint path
- WHEN `HttpClient` executes a GET/POST/PUT/DELETE request and receives a 2xx status
- THEN it SHALL parse and return the typed payload without throwing an exception.

#### Scenario: Request timeout handling

- GIVEN a request configured with a timeout threshold (e.g. 10s)
- WHEN the server does not respond within the threshold
- THEN `HttpClient` SHALL abort the request and throw a typed `ApiTimeoutError`.

### Requirement: Domain Error Normalization

The library SHALL intercept non-2xx HTTP responses and network failures, transforming them into a structured `ApiClientError` error hierarchy (`ApiHttpError`, `ApiNetworkError`, `ApiTimeoutError`).

#### Scenario: HTTP Error status normalization

- GIVEN a backend route returning a 404 or 500 status code with a JSON error payload
- WHEN a client method executes against that endpoint
- THEN it SHALL throw an `ApiHttpError` containing `status`, `statusText`, and parsed server error details.

#### Scenario: Offline / Network unreachable failure

- GIVEN the device is offline or the host is unreachable
- WHEN a client method triggers a request
- THEN it SHALL throw an `ApiNetworkError` preserving the original cause.

### Requirement: Resource Endpoints Decoupling

The library SHALL organize API interactions into modular resource sub-clients (`readings`, `authors`, `users`, `system`) exposed via a root `ApiClient` instance.

#### Scenario: Readings resource CRUD interaction

- GIVEN an initialized `ApiClient`
- WHEN invoking `api.readings.getAll()`, `api.readings.create(payload)`, `api.readings.update(id, payload)`, or `api.readings.delete(id)`
- THEN each method SHALL communicate with the corresponding `/v1/readings` endpoint using correct HTTP methods and DTO typings.

#### Scenario: Authors resource interaction

- GIVEN an initialized `ApiClient`
- WHEN invoking `api.authors.create(payload)`
- THEN it SHALL communicate with `/v1/authors` and return the newly generated author ID or DTO.

### Requirement: Mobile Adapter Integration

The mobile application's `HttpReadingApiAdapter` SHALL delegate all HTTP requests to `ApiClient`, removing raw `fetch` and manual URL concatenation.

#### Scenario: HttpReadingApiAdapter delegates to ApiClient

- GIVEN `HttpReadingApiAdapter` in `apps/mobile`
- WHEN `fetchReadings()`, `postReading()`, `putReading()`, or `deleteReading()` are called
- THEN all network execution SHALL pass through the `ApiClient` methods while preserving existing adapter return types (`Reading[]`, `boolean`).
