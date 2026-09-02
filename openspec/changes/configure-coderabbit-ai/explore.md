# Exploration: Configure CodeRabbit AI Architectural Governance

## 1. Context & Architecture

- **Repository**: `myself-monorepo` (Turborepo + Bun 1.3.14).
  - `apps/mobile`:
    - Framework: Expo SDK 57, React Native 0.86, React 19, Expo Router 57 (`src/app/`).
    - UI: `@expo/ui` native components for iOS/Android, Reanimated 4 worklets, Glass Effect, Symbols.
    - Data & Storage: Expo SQLite (`src/db/`), localized seed and state management.
    - Architecture: Presentation screens orchestrating custom hooks (`src/hooks/`), Strategy pattern for platform-divergent implementations (`src/services/meditation-session/`), design tokens (`src/theme/colors.ts`).
    - Native build model: Continuous Native Generation (CNG) via `app.json` / config plugins — raw `ios/` and `android/` folders are never manually modified.
  - `apps/api`:
    - Runtime: Cloudflare Workers deployed via Wrangler.
    - Framework: Hono (`hono`) with `@hono/zod-validator`.
    - Patterns: Structured response envelopes (`src/lib/response.ts`), cursor/offset pagination (`src/lib/pagination.ts`), strict Zod validation schemas.
  - `packages/shared`:
    - Role: Shared domain models, contracts, and Hono RPC client definitions.
    - Dependencies: Minimal runtime dependencies (`hono`, `zod`). Must remain platform-agnostic and free of cyclical imports.
- **Current Quality Tooling**:
  - `bun test` collocated in `__tests__/` across workspaces.
  - ESLint with `eslint-config-expo` on mobile and baseline ESLint on api/shared.
  - Turborepo caching via `turbo.json`.
  - GitHub Actions CI in `.github/workflows/ci.yml`.

## 2. Problem & Motivation

Without dedicated AI-assisted PR review rules:
1. Review feedback tends to produce generic, non-actionable stylistic remarks rather than catching architectural drift.
2. Changes to `apps/mobile` risk violating Expo Router file-based routing principles (e.g., introducing fat screen components or direct SQLite calls in route files).
3. Changes to `apps/api` risk leaking Node.js runtime APIs that fail on Cloudflare Workers edge nodes, or omitting input validation with `@hono/zod-validator`.
4. Changes to `packages/shared` have a high blast radius and must be monitored for breaking schema or type changes.
5. Large generated files (`bun.lock`, `.turbo/**`, `.expo/**`, `dist/**`) pollute review context if not aggressively filtered.

## 3. Target State

A centralized `.coderabbit.yaml` configuration at repository root:
- Runs with `profile: "assertive"` and `request_changes_workflow: true` to catch critical defects before merge.
- Applies granular `path_instructions` tailored to the architectural responsibilities of each workspace.
- Configures comprehensive `path_filters` to eliminate review noise.
- Enforces conventional commits and team contribution standards.
