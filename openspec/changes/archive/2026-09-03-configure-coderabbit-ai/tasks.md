# Tasks: Configure CodeRabbit AI Architectural Governance

- [x] **Task 1: Generate `.coderabbit.yaml`**
  - [x] 1.1 Configure root schema, language, profile (`assertive`), and request changes workflow.
  - [x] 1.2 Define path filters for lockfiles, caches, build output, and media assets.
  - [x] 1.3 Implement mobile workspace path instructions (`apps/mobile/**`).
  - [x] 1.4 Implement API workspace path instructions (`apps/api/**`).
  - [x] 1.5 Implement shared package path instructions (`packages/shared/**`).
  - [x] 1.6 Implement monorepo and commit governance instructions.
- [x] **Task 2: Verification & Quality Gate**
  - [x] 2.1 Verify YAML syntax validity with Python / Bun runtime.
  - [x] 2.2 Verify SDD state machine tracking via `gentle-ai sdd-status`.
  - [x] 2.3 Run monorepo typecheck, lint, and tests via `make check`.
- [x] **Task 3: Finalize OpenSpec SDD State**
  - [x] 3.1 Mark all tasks completed in `tasks.md`.
