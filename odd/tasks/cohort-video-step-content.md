# Cohort Program Video Lessons & Preparatory Exercises

## Objective

Add dedicated multimedia preparatory content (`program_step_contents`) for cohort program steps. Users watch a linked YouTube video and review preparatory instructions/exercises before answering their daily reflection question.

## Scope & Constraints

- Monorepo packages: `packages/shared`, `apps/mobile`.
- Schema & Shared Kernel (`@myself/shared`):
  - Table `program_step_contents`: `id`, `question_id`, `video_url`, `preparatory_text`, `created_at`.
  - Zod schemas, types, and seed data (linking Day 1 of the Stoic resilience theme to the provided YouTube video and Epictetus practical exercise).
- Mobile Infrastructure & Persistence (`apps/mobile`):
  - Database table creation in `database.ts` / SQLite schema.
  - Seed execution in `seed.ts`.
  - Extend `SqliteReflectionRepository` and domain ports to return step content alongside active questions.
- Video Player Component (`apps/mobile`):
  - Install `react-native-webview` (`bunx expo install react-native-webview`).
  - Cross-platform `YouTubePlayer` component (WebView on iOS/Android, native iframe on Web) with 16:9 ratio and loading states.
- Cohort Step UI (`apps/mobile`):
  - Update `reflections.tsx` to display the video player and preparatory markdown text prior to answering.
- Quality gates: `make check-tests`, `make check-types`, `make check-lint`, `make check-format`.
- Conventional commits without AI attribution.

## Configuration & Runner

- **TDD Mode**: Enabled (RED -> GREEN -> REFACTOR)
- **Test Runner**: `make check-tests`
- **Delivery Strategy**: `ask-on-risk` (forecast: ~350 lines)

## Tasks

- [x] **TASK-1**: Shared Schema & Types: Define `program_step_contents` in Drizzle SQLite schema, Zod schema, types, and seed data (with optional `video_url`).
- [x] **TASK-2**: Persistence & Repository: Create table in SQLite schema, seed data in `seed.ts`, and load `programStepContent` in `SqliteReflectionRepository`.
- [x] **TASK-3**: Universal Video Player: Install `react-native-webview` and implement `YouTubePlayer` component.
- [x] **TASK-4**: Cohort Step UI Flow: Display video player (when present) and preparatory exercise text before the answer prompt in `reflections.tsx`.
- [x] **TASK-5**: Verification & Quality Gates: Run test suites, typechecks, lint, format, and commit evidence.

## Evidence & Verification

- `make check-tests`: 335 pass, 0 fail (across 44 files, including `programStepContentSchema` validation, `SEED_PROGRAM_STEP_CONTENTS`, `extractYouTubeVideoId`, and `SqliteReflectionRepository.getProgramStepContentForQuestion`).
- `make check-types`: 3 packages (`@myself/api`, `@myself/mobile`, `@myself/shared`) typechecked clean without errors.
- `make check-lint`: ESLint and expo lint passed with 0 errors across monorepo.
- `make check-format`: Prettier format verified clean across the repository.
- **Completion & Delivery**: Completed on branch `feat/cohort-video-step-content` (closes #77).
