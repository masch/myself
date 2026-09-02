# Design: CodeRabbit AI Architectural Governance Configuration

## 1. System Topology & Integration Flow

CodeRabbit operates as a GitHub App triggered on pull request events. It reads repository context and configuration from `.coderabbit.yaml` at the root of the repository:

```
┌─────────────────────────────────────────────────────────────┐
│                    Pull Request Event                       │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   CodeRabbit Review Engine                  │
│  - Reads .coderabbit.yaml (Schema v2)                       │
│  - Profile: "assertive"                                     │
│  - Workflow: request_changes_workflow = true                │
└───────┬──────────────────────┬──────────────────────┬───────┘
        │                      │                      │
        ▼                      ▼                      ▼
┌──────────────────┐   ┌──────────────────┐   ┌───────────────┐
│   apps/mobile    │   │     apps/api     │   │packages/shared│
├──────────────────┤   ├──────────────────┤   ├───────────────┤
│ - Expo Router    │   │ - Edge Runtime   │   │ - Contracts   │
│ - @expo/ui       │   │ - Hono + Zod     │   │ - Zero Deps   │
│ - Strategy Ptrn  │   │ - Standard Resp  │   │ - Type Safety │
│ - CNG Guard      │   │ - Route Tests    │   │ - Blast Radius│
└──────────────────┘   └──────────────────┘   └───────────────┘
```

## 2. Configuration Design

### 2.1 Top-Level Directives
- **`language`**: `"en"` — All automated review output will be emitted in clear, professional English.
- **`early_access`**: `false` — Prioritize proven, stable rules.
- **`reviews.profile`**: `"assertive"` — Thorough, strict technical critique.
- **`reviews.request_changes_workflow`**: `true` — When critical architectural defects or type errors occur, request changes.
- **`reviews.high_level_summary`**: `true` — Concise overview of PR architecture.
- **`reviews.poem`**: `false` — Zero stylistic distraction.
- **`reviews.collapse_walkthrough`**: `false` — Clear file-by-file review findings.

### 2.2 Path Filtering Strategy (`path_filters`)
Filters use gitignore/glob pattern syntax:
- Root lockfiles: `!bun.lock`
- Turborepo & build outputs: `!.turbo/**`, `!dist/**`, `!build/**`
- Workspace caches: `!apps/*/.turbo/**`, `!packages/*/.turbo/**`
- Expo artifacts: `!.expo/**`, `!apps/mobile/.expo/**`, `!apps/mobile/dist/**`
- Cloudflare Wrangler state: `!apps/api/.wrangler/**`
- Archival documentation: `!openspec/changes/archive/**`
- Binary and media assets: `!**/*.png`, `!**/*.jpg`, `!**/*.jpeg`, `!**/*.svg`, `!**/*.wasm`, `!**/*.mp3`

### 2.3 Path Instructions Architecture (`path_instructions`)

#### Boundary 1: `apps/mobile/**`
Focus: Expo Router patterns, UI layer separation, multiplatform strategy, and CNG.
- Enforce that `src/app/**` contains only route navigation logic and screen composition.
- Prohibit direct database (`expo-sqlite`) or complex business logic inside route files — delegate to `src/hooks/**`.
- Require `@expo/ui` components for native standard controls before introducing third-party wrappers. Note that `@expo/ui` `List` is for grouped settings/form rows, not large virtualized datasets (which require `FlatList`/`FlashList`).
- For platform-divergent native capabilities, enforce Strategy pattern (`services/meditation-session/{ios-strategy, android-strategy, web-strategy, index.ts, index.web.ts}`).
- Protect CNG: flag any added or modified files under `apps/mobile/ios` or `apps/mobile/android`.
- Mandate theme token usage from `src/theme/colors.ts`.

#### Boundary 2: `apps/api/**`
Focus: Cloudflare Workers edge compatibility, schema validation, and structured responses.
- Enforce edge runtime safety: prohibit Node.js specific libraries (`fs`, `child_process`, `crypto` without `node:` prefix / worker compatibility).
- Mandate `@hono/zod-validator` (e.g. `zValidator('json', schema)`) on all mutation routes and query parameters.
- Mandate standardized response helpers (`src/lib/response.ts` e.g. `successResponse`, `errorResponse`).
- Require pagination parameters to utilize `src/lib/pagination.ts`.
- Demand tests in `src/routes/__tests__/` or `src/lib/__tests__/` for new endpoints.

#### Boundary 3: `packages/shared/**`
Focus: Interface contracts and blast radius control.
- Enforce single source of truth for Zod schemas (`src/schemas/`) and TypeScript interfaces (`src/types/`).
- Prohibit imports from `apps/mobile` or `apps/api` (strictly enforce inward-only dependency direction).
- Flag breaking changes (removing fields, altering required types) with high severity.

#### Boundary 4: Root & Monorepo Configuration
Focus: Tooling governance and commit etiquette.
- Enforce Bun (`bun install`, `bun test`, `bun run`).
- Enforce Turborepo tasks in `turbo.json` for new scripts.
- Enforce Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`).
- Prohibit AI co-author trailers (`Co-Authored-By`).
