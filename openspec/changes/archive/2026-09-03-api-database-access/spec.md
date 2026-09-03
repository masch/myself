# Change Specification: API Database Access with Turso & Hexagonal Architecture

## 1. Requirements

### REQ-01: Domain Repository Ports Isolation

The database access layer SHALL decouple HTTP routing from persistence through domain repository port interfaces defined exclusively with types from `@myself/shared`. No database driver, SQL syntax, or ORM specific types may be exposed across the repository port boundary.

#### Scenario: Interacting with the Author Repository Port

- GIVEN a request to list or create authors in `apps/api`
- WHEN the route handler orchestrates data persistence
- THEN it communicates strictly through the `AuthorRepository` port interface using domain entities and pagination contracts.

### REQ-02: Turso and libSQL Infrastructure Adapter

The system SHALL provide a concrete infrastructure adapter implementing repository ports with `drizzle-orm` and `@libsql/client/web`, communicating with Turso over HTTP using environment configuration (`TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`).

#### Scenario: Connecting to Turso in Cloudflare Workers

- GIVEN a Cloudflare Worker request handling a database operation
- WHEN the infrastructure adapter executes a query
- THEN it connects over HTTP via `@libsql/client/web` to the configured Turso endpoint without requiring native Node.js TCP sockets.

### REQ-03: Drizzle Schemas and Enum Check Constraints

The database schema SHALL define tables for core domain entities (`authors`, `meditation_readings`, `users`, `tasks`, and `reading_logs`) with UUID primary keys. Domain enums SHALL be enforced at the database engine level via SQL `CHECK` constraints alongside compile-time TypeScript type definitions.

#### Scenario: Inserting records with enum fields

- GIVEN an insert or update operation containing an enum field
- WHEN the record is written to the Turso SQLite database
- THEN the value is validated by a database-level `CHECK (column IN (...))` constraint, rejecting invalid values.

### REQ-04: Context Dependency Injection in Route Handlers

The application SHALL inject repository instances into Hono request context via middleware. Route handlers under `src/routes/` SHALL NOT directly instantiate database clients or execute raw SQL.

#### Scenario: Processing HTTP routes through injected repositories

- GIVEN an incoming HTTP request to `/v1/authors`
- WHEN the route handler executes
- THEN it retrieves `c.var.authorRepo` from the Hono context to perform data retrieval and mutation.

### REQ-05: Hermetic In-Memory Testing and Response Contracts

The test suite SHALL provide in-memory repository adapters allowing `bun test` suites to run hermetically without external network calls or cloud credentials, while preserving standard `ApiResponse<T>` response envelopes.

#### Scenario: Executing automated test suite

- GIVEN route unit tests in `apps/api`
- WHEN tests execute via `bun test`
- THEN all tests pass using in-memory repository doubles and verify that API responses preserve the standard `ApiResponse<T>` format.
