# Change Specification: Configure CodeRabbit AI Architectural Governance

## 1. Requirements

### REQ-01: Schema & Profile Enforcement

The `.coderabbit.yaml` file SHALL reference the official CodeRabbit v2 schema, configure `language: "en"`, activate `profile: "assertive"`, and enable `request_changes_workflow: true`.

#### Scenario: Assertive review posture
- GIVEN a pull request submitted to the repository
- WHEN CodeRabbit processes the changes
- THEN it executes with assertive scrutiny and requests changes on blocking defects rather than solely posting advisory comments.

### REQ-02: Path Filtering & Noise Suppression

The configuration SHALL suppress automated review on dependency lockfiles, build outputs, package caches, binary assets, and archived SDD specifications.

#### Scenario: Filtering generated artifacts
- GIVEN a pull request modifying `bun.lock`, build directories (`dist/**`, `.turbo/**`, `.expo/**`), or `openspec/changes/archive/**`
- WHEN CodeRabbit calculates files for review
- THEN those files are excluded from automated line-by-line inspection.

### REQ-03: Mobile Architectural Guardrails

The configuration SHALL enforce architectural rules specific to `apps/mobile/**`:
1. Presentation screens in `src/app/` must delegate business logic, state, and database operations to custom hooks in `src/hooks/`.
2. Native UI components from `@expo/ui` must be preferred over raw React Native or third-party wrappers where applicable.
3. Multiplatform native implementations must implement the Strategy pattern (e.g. `src/services/meditation-session/`).
4. Direct manual edits to `ios/` and `android/` folders are prohibited under Continuous Native Generation.
5. Colors must be imported from `src/theme/colors.ts`.

#### Scenario: Reviewing mobile workspace changes
- GIVEN a pull request with modifications under `apps/mobile/`
- WHEN CodeRabbit reviews the changes
- THEN it evaluates compliance against Expo Router structure, `@expo/ui` usage, Strategy patterns, and CNG constraints.

### REQ-04: API & Edge Runtime Guardrails

The configuration SHALL enforce architectural rules specific to `apps/api/**`:
1. Cloudflare Workers edge runtime compatibility must be maintained (no unsupported Node.js native modules).
2. Input payloads and query parameters must be validated using `@hono/zod-validator` and Zod schemas.
3. Handlers must return standard response envelopes from `src/lib/response.ts` and use `src/lib/pagination.ts` for paginated responses.
4. Every route change must include accompanying tests in `src/routes/__tests__/`.

#### Scenario: Reviewing API workspace changes
- GIVEN a pull request with modifications under `apps/api/`
- WHEN CodeRabbit reviews the changes
- THEN it validates edge runtime safety, Zod input validation, response envelopes, and test coverage.

### REQ-05: Shared Package & Monorepo Governance

The configuration SHALL enforce boundaries for `packages/shared/**` and monorepo tooling:
1. `packages/shared` must not import from any `apps/` workspace (zero circular dependencies).
2. Breaking changes to shared Zod schemas or TypeScript types must be flagged as high-severity blast radius.
3. Package management must exclusively use Bun (`bun install`, `bun.lock`).
4. Commit messages must comply with Conventional Commits.
5. AI attribution (`Co-Authored-By`) is disallowed.

#### Scenario: Reviewing shared contract changes
- GIVEN a pull request altering files in `packages/shared/` or root configuration
- WHEN CodeRabbit reviews the changes
- THEN it verifies dependency hygiene, package boundaries, and commit standards.
