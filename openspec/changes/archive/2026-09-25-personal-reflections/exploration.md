# Exploration: Personal Reflections System

- **Change**: `personal-reflections`
- **Execution Mode**: `interactive`
- **Artifact Store**: `hybrid` (OpenSpec + Engram)
- **Delivery Strategy**: `single-pr`

---

## 1. Current State & Architecture

The application currently features:

1. **Domain Isolation in `@myself/shared`**:
   - Business entities, validation schemas (Zod), and Drizzle SQLite tables are organized modularly in `packages/shared/src/modules/` (`authors`, `readings`, `tasks`, `users`).
   - SQLite schema migrations are bundled in `packages/shared/src/migrations/index.ts` (`SHARED_MIGRATIONS`) and applied at startup by `apps/mobile/src/infrastructure/persistence/database.ts`.
2. **Hexagonal Architecture in `apps/mobile`**:
   - Feature domains live under `apps/mobile/src/features/` (e.g., `readings`) with dedicated domain contracts, SQLite repositories, hooks, and presentational components.
   - Global catalog data (like `meditation_readings`) is decoupled from personal user activity logs (like `reading_logs`), supporting local offline queries and sync outbox integration.
3. **Expo Router Navigation**:
   - The app uses Expo Router with `NativeTabs` (`index`, `meditation`, `readings`, `settings`).

Currently, there is no domain model or UI for recording self-reflections, managing structured question cycles, or scheduling periodic prompt evaluations.

---

## 2. Problem Statement & Requirements

The user needs a reflection journaling system with two decoupled layers:

1. **Pre-configured Prompt Catalog**:
   - **Categories**: High-level grouping (e.g., Stoicism, Gratitude, Daily Mindfulness).
   - **Themes (Temáticas / Cycles)**: Specific series of $X$ questions designed to be answered sequentially or as a pack to complete a cycle.
   - **Questions / Prompts**: General pre-loaded questions with:
     - Assigned category.
     - Optional theme association.
     - Periodicity: `daily`, `weekly`, `monthly`, or `ad_hoc` ("actual").
     - Scheduled time of day (e.g., morning, evening, or specific hour string).
2. **Personal Reflection Journal**:
   - Strictly personal answers tied to the authenticated/active user.
   - History of completed reflections per question and theme.
   - Cycle progress tracking (e.g., questions completed out of $X$ in the theme).

---

## 3. Affected Areas

- `packages/shared/src/modules/reflections/`:
  - Domain entities and Zod contracts (`Category`, `Theme`, `Question`, `Reflection`, `ThemeCycleProgress`).
  - Drizzle SQLite table definitions (`reflection_categories`, `reflection_themes`, `reflection_questions`, `user_reflections`, `user_theme_progress`).
- `packages/shared/src/migrations/`:
  - Migration script adding reflection tables and seed catalog data.
- `apps/mobile/src/features/reflections/`:
  - Domain interfaces / Ports (e.g. `ReflectionRepository`, `CycleService`).
  - Infrastructure SQLite adapters implementing queries for active prompts, category filters, theme cycles, and reflection submissions.
  - Hooks: `useActiveReflections`, `useReflectionThemeCycle`, `useReflectionHistory`.
  - UI Components: Prompt card, cycle progress indicator, reflection editor, periodicity badges.
- `apps/mobile/src/app/(tabs)/` or dedicated routes:
  - Integration into existing navigation (e.g., tab item or section within Home/Readings).

---

## 4. Approaches Considered

### Option A: Hexagonal Module across Shared Domain & Mobile App (Recommended)

- Define domain models, Zod schemas, and SQLite Drizzle tables in `packages/shared/src/modules/reflections`.
- Add Drizzle migration to `SHARED_MIGRATIONS` with seed prompts and themes.
- Implement `apps/mobile/src/features/reflections` following Ports & Adapters, consuming `@myself/shared`.
- **Pros**:
  - Consistent with existing architecture (`readings`, `tasks`, `authors`).
  - Type-safe contracts shared between mobile and potential future API/sync endpoints.
  - Clear boundary between pre-seeded catalog data and private user responses.
- **Cons**:
  - Requires migration generation and coordination across monorepo packages.
- **Complexity**: Medium.

### Option B: Mobile-Local Storage Only (Ad-hoc SQLite / AsyncStorage)

- Implement tables directly in `apps/mobile` without modifying `packages/shared`.
- **Pros**: Slightly less monorepo scaffolding upfront.
- **Cons**: Violates existing Clean Architecture conventions, duplicates validation logic, prevents future cloud sync or web client reuse.
- **Complexity**: Medium-Low.

---

## 5. Architectural Recommendations & Decisions

1. **Adopt Option A**: Keep domain definitions and database schemas in `packages/shared`, ensuring single source of truth and parity with `readings`.
2. **Domain Cycle Modeling**:
   - Model `Theme` with `target_question_count: number`.
   - Model `ThemeCycle` tracking user progress `(theme_id, user_id, completed_count, status: 'active' | 'completed')`.
3. **Periodicity & Scheduling**:
   - Periodicity enum: `['daily', 'weekly', 'monthly', 'ad_hoc']`.
   - Time of day: store `preferred_time_of_day` (e.g. `'08:00'`, `'20:00'`) or enum (`'morning' | 'afternoon' | 'evening' | 'any'`) to determine when prompts surface in the user's daily queue.
4. **Seed Content**:
   - Provide an initial curated set of categories (e.g., "Stoic Reflection", "Gratitude", "End of Day Review") and sample thematic cycles.

---

## 6. Risks & Mitigation

| Risk                                                  | Severity | Mitigation                                                                                                 |
| ----------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------- |
| Migration drift in mobile SQLite                      | Med      | Follow existing `runMigrations` pattern with explicit journal entries in `packages/shared/src/migrations`. |
| Cycle progression complexity (skipping vs sequential) | Low      | Allow both linear cycle progression and ad-hoc question access, tracking completed reflections per theme.  |
| Timezone & scheduling inconsistencies                 | Low      | Store dates in UTC ISO-8601 strings and calculate periodicity relative to user's local day start.          |

---

## 7. Ready for Proposal

**Yes**. The domain requirements are well-defined and align cleanly with the project's existing hexagonal architecture.
