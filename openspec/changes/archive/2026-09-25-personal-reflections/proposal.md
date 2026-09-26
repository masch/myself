# Proposal: Personal Reflections System

## Intent

Enable users to record personal reflections in response to pre-configured seed questions, supporting daily routines, skip tracking with required rationale, catch-up grace periods, local notifications, and thematic inquiry cycles to foster self-awareness.

## Scope

### In Scope

- Domain models and Zod contracts for seed categories, themes (cycles of X questions), questions, personal responses, and cycle runs.
- Seed data migrations in `@myself/shared` for question catalogs, scheduling metadata, and system constraints (catch-up & edit windows).
- Mobile feature module (`apps/mobile/src/features/reflections`) with local SQLite repository and domain services.
- Unified Daily Inbox aggregating routine questions and current steps of active thematic programs.
- Skip workflow requiring a stated reason, maintaining `skipped` status with ability to answer later while the cycle is active.
- Configurable grace period (N days) for catching up on missed daily questions and edit window (N days) for updating answers.
- Historical cycle run tracking allowing users to re-run themes over time.
- Local push notifications scheduled at the question's preferred time.
- Mobile UI: Unified Daily Queue, Program Progress Tracker, Reflection/Skip Modal, and History Journal.

### Out of Scope

- Admin CRUD/ABM for questions inside the mobile app (catalog is strictly pre-loaded via seed migrations).
- Cloud synchronization backend endpoints (deferred to a subsequent API change).
- Multi-user sharing or social reflection feeds (strictly personal & private).

## Capabilities

### New Capabilities

- `personal-reflections`: Record personal responses, handle rationale-backed skips, manage edit windows, and track thematic cycle runs.
- `reflection-prompt-catalog`: Pre-loaded catalog of categories, questions with periodicities and local notification scheduling, and thematic programs with system rules.

### Modified Capabilities

- None.

## Approach

Follow the repository's established Hexagonal Architecture:

1. **Shared Domain Layer**: Define `Category`, `Theme`, `Question`, `Reflection`, `ThemeCycleRun` contracts in `packages/shared/src/modules/reflections/` alongside Drizzle SQLite schemas.
2. **Database Migration**: Register tables in `packages/shared/src/migrations/` with curated seed prompts, themes, and default window constraints.
3. **Mobile Feature Ports & Adapters**: Implement `ReflectionRepositoryPort` in `apps/mobile/src/features/reflections/infrastructure/` using `expo-sqlite`, plus a notification service adapter wrapping `expo-notifications`.
4. **Presentational Layer**: Build reactive hooks (`useDailyReflections`, `useThemeCycle`) and mobile screens adhering to iOS/Android design standards.

## Affected Areas

| Area                                       | Impact   | Description                                                        |
| ------------------------------------------ | -------- | ------------------------------------------------------------------ |
| `packages/shared/src/modules/reflections/` | New      | Entities, schemas, and contracts                                   |
| `packages/shared/src/migrations/`          | Modified | Drizzle migration bundle with seed data and window configs         |
| `apps/mobile/src/features/reflections/`    | New      | Hexagonal feature module (domain, repos, hooks, UI, notifications) |
| `apps/mobile/src/app/(tabs)/`              | Modified | Navigation entry point for reflections                             |

## Risks

| Risk                                        | Likelihood | Mitigation                                                                         |
| ------------------------------------------- | ---------- | ---------------------------------------------------------------------------------- |
| Device notification permission rejections   | Med        | Degrade gracefully; keep in-app daily queue fully functional without notifications |
| State confusion between skipped vs answered | Low        | Explicit `status: 'answered'                                                       | 'skipped'`column with required`skip_reason` |

## Rollback Plan

Revert the migration commit and remove reflections feature directories.

## Dependencies

- `@myself/shared` build pipeline.
- `expo-sqlite` and `expo-notifications`.

## Success Criteria

- [ ] Unified Daily Queue shows active daily questions and active program steps.
- [ ] Users can submit reflections or skip questions with a mandatory reason.
- [ ] Skipped questions can be revisited and answered before cycle completion.
- [ ] Cycles with completed or skipped items mark as completed with accurate stats.
- [ ] Completed programs can be re-run cleanly as new historical cycles.
- [ ] Unit and integration tests pass with 100% success across shared and mobile packages.
