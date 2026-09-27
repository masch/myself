# Optimize GitHub Actions CI Pipeline

## Objective

Optimize `.github/workflows/ci.yml` pipeline by parallelizing validation jobs (static analysis, unit tests, and Playwright browser E2E), caching Playwright browser binaries (`~/.cache/ms-playwright`), leveraging path filters for E2E execution, and adding dependency caching to deployment jobs while preserving required branch protection status checks (`Lint, Typecheck & Test`).

## Scope & Constraints

- Workflow files: `.github/workflows/ci.yml` and `Makefile`.
- Preserve GitHub branch protection required status check context: `Lint, Typecheck & Test`.
- Ensure zero breakage for PR validation and staging/production deployments.
- No artificial abstractions or cosmetic line deletions.
- Follow conventional commits without AI attribution.

## Tasks

- [x] **TASK-1**: Enhance `paths-filter` in CI workflow to detect `e2e` relevant changes.
- [x] **TASK-2**: Implement parallel `static-analysis`, `unit-tests`, and `e2e-browser` jobs with Playwright binary caching (`~/.cache/ms-playwright`).
- [x] **TASK-3**: Add gatekeeper `validate` job named `Lint, Typecheck & Test` aggregating parallel results for branch protection.
- [x] **TASK-4**: Optimize mobile and API deployment jobs with dependency caching and remove redundant `playwright-install`.
- [x] **TASK-5**: Validate workflow syntax, verify local test suites, and review branch protection compatibility.

## Evidence & Verification

- `TASK-1`: Enhanced `dorny/paths-filter` to output `e2e` for changes in `apps/mobile/**`, `apps/api/**`, `packages/shared/**`, `e2e/**`, `playwright.config.ts`, `bun.lock`, `package.json`, `turbo.json`, and `Makefile`.
- `TASK-2`: Split monolithic `validate` into `static-analysis` (`make check-format`, `make check-static`), `unit-tests` (`make check-tests`, `make check-doctor`), and `e2e-browser` (`make check-e2e-browser`). Added `actions/cache@v4` on `~/.cache/ms-playwright` with key `${{ runner.os }}-playwright-${{ hashFiles('bun.lock') }}`; conditioned browser download on cache miss and OS dependencies on cache hit.
- `TASK-3`: Created gatekeeper job `validate` named `Lint, Typecheck & Test` that evaluates results across parallel checks, preserves compatibility with GitHub branch protection required contexts, and handles skipped E2E jobs on non-E2E changes.
- `TASK-4`: Added `node_modules` and Bun cache (`~/.bun/install/cache`) via `actions/cache@v4` to `deploy_mobile_staging` and `deploy_mobile_production`, switching `make install` to `bun install --frozen-lockfile` to eliminate unnecessary browser downloads on EAS deploy runners. Standardized cache action in API deploy jobs.
- `TASK-5`: Verified workflow YAML syntax with PyYAML parser, verified all 174 unit tests, lint, typecheck, prettier, and expo-doctor (`make check`), and verified full Playwright browser suite (`make check-e2e-browser`: 5/5 passed).
