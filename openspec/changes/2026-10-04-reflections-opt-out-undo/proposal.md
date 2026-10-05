# Proposal: Daily Reflections Routine Opt-Out Undo & Generic Toast

## Intent

Empower users to safely opt out of daily routine questions with immediate recovery via an accessible "Undo" Toast notification and long-term recovery via a collapsible "Preguntas pausadas" section in the Daily Queue (`Cola Diaria`). Additionally, introduce an app-wide, reusable Toast system across `@/components`.

## Scope

### In Scope

- **Generic Reusable Toast System**:
  - `ToastProvider` and `useToast` hook under `apps/mobile/src/components/toast/`.
  - Accessible floating banner supporting title/message, optional action button (e.g., "Deshacer"), configurable timeout, and visual variants.
  - Integration in `apps/mobile/src/app/_layout.tsx`.
- **Reflections Domain & Infrastructure**:
  - Add `getOptedOutRoutineQuestions` to `ReflectionRepositoryPort` and `SqliteReflectionRepository`.
  - Expose `optedOutRoutineQuestions` in `useDailyReflections` hook.
- **Reflections Screen UX**:
  - Trigger an immediate Toast with "Deshacer" when tapping "Bajar" in `PromptCard`.
  - Display a collapsible "Preguntas pausadas (N)" section at the bottom of the Daily Queue.
  - Allow users to tap "Reactivar" to restore any paused routine question, showing a confirmation Toast.

### Out of Scope

- Cloud sync changes (domain remains offline-first in SQLite).
- Modifying thematic cohort questions (this change targets individual daily routine prompts).
- Notification push channels outside local notifications.

## Capabilities

### New Capabilities

- `toast-system`: Generic, accessible app-wide banner overlay with action callback and auto-dismiss.

### Modified Capabilities

- `personal-reflections`: Support retrieval and reactivation of opted-out daily routine questions.

## Approach

1. **Reusable Toast Primitive**: Build `ToastProvider` and `ToastBanner` using design tokens from `@/theme` and safe-area insets.
2. **Repository Port & Adapter**: Extend SQLite query with `p.is_enabled = 0` to fetch paused routine questions cleanly.
3. **Hook Reactive State**: Ensure `refresh` loads both active and paused questions simultaneously.
4. **Screen Integration**: Add an undo handler to the opt-out callback and append the collapsible section at the bottom of `reflections.tsx`.
