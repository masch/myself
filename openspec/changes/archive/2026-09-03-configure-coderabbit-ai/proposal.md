# Change Proposal: Configure CodeRabbit AI Architectural Governance

## 1. Problem Statement

Automated pull request reviews often suffer from low signal-to-noise ratio. Generic AI reviewers frequently flag cosmetic issues while missing fundamental architectural regressions, such as:

- Violating Expo Router separation of concerns (inlining business logic into route files).
- Introducing unvalidated input vectors in Hono endpoints.
- Breaking edge runtime constraints on Cloudflare Workers.
- Leaking breaking schema mutations in shared packages without downstream updates.
- Touching generated native directories in an Expo Continuous Native Generation (CNG) setup.

The repository needs an explicit, assertive, and architecture-aware review configuration that enforces domain rules across all monorepo packages while ignoring generated artifacts.

## 2. Proposed Solution

Establish a root-level `.coderabbit.yaml` configured according to CodeRabbit Schema v2 with:

1. **Assertive Profile & Blocking Workflow**:
   - `profile: "assertive"` to conduct thorough, rigorous technical reviews.
   - `request_changes_workflow: true` to submit formal "Request changes" reviews when architectural or type issues are discovered (enforcing merge blocking when paired with GitHub branch protection rules requiring passing reviews).
   - `poem: false` and `collapse_walkthrough: false` for actionable, direct feedback.
2. **Noise Reduction (`path_filters`)**:
   - Exclude generated artifacts, lockfiles, build outputs, and caches (`bun.lock`, `dist/**`, `.turbo/**`, `.expo/**`, `node_modules/**`, `openspec/changes/archive/**`).
3. **Architectural Guardrails (`path_instructions`)**:
   - `apps/mobile/**`: Enforce Expo Router conventions (`src/app/` as presentation only, hooks in `src/hooks/`), prefer `@expo/ui` native components, mandate the Strategy pattern for multiplatform audio/sessions, forbid manual edits to `ios/` or `android/`, and enforce tokens from `src/theme/colors.ts`.
   - `apps/api/**`: Enforce Cloudflare Workers edge compatibility, mandate `@hono/zod-validator` on all input routes, require standardized response envelopes (`src/lib/response.ts`), and demand unit tests in `src/routes/__tests__/`.
   - `packages/shared/**`: Enforce strict type safety, zero workspace-internal imports, and flag breaking changes to Zod schemas or types.
   - Root & Monorepo: Enforce Bun package management, Turborepo pipeline configuration, and Conventional Commits.

## 3. Impact & Blast Radius

- **Runtime Impact**: None. `.coderabbit.yaml` affects only GitHub PR review workflows.
- **Workflow Impact**: High positive impact. PR authors receive automated, assertive architectural feedback aligned with repository standards.
