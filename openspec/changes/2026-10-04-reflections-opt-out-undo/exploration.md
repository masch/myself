# Exploration: Daily Reflections Routine Opt-Out Undo & Generic Toast

- **Change**: `2026-10-04-reflections-opt-out-undo`
- **Execution Mode**: `interactive`
- **Artifact Store**: `openspec`
- **Delivery Strategy**: `ask-on-risk`
- **Budget**: `400` lines

---

## 1. Current State & Root Cause Analysis

### Identified Behavior

1. In `apps/mobile/src/features/reflections/components/PromptCard.tsx` (lines 160–171), routine prompt cards display a `ChipButton`:
   ```tsx
   <ChipButton
     title={isRoutineEnabled ? "Bajar" : "Reactivar"}
     variant={isRoutineEnabled ? "secondary" : "destructive"}
     onPress={() => onToggleOptOut(!isRoutineEnabled)}
   />
   ```
2. When the user taps "Bajar", `toggleRoutineOptOut(question.id, false)` sets `user_question_preferences.is_enabled = 0` via `SqliteReflectionRepository.setRoutineOptOut`.
3. In `SqliteReflectionRepository.getDailyRoutineQuestions` (lines 189–196):
   ```sql
   SELECT ... FROM reflection_questions q
   LEFT JOIN user_question_preferences p ON p.question_id = q.id AND p.user_id = ?
   WHERE q.periodicity = 'daily' AND q.theme_id IS NULL AND (p.is_enabled IS NULL OR p.is_enabled = 1)
   ```
4. As soon as `is_enabled` is set to `0`, the query immediately filters the question out.
5. Consequently, the card disappears instantly from the screen:
   - There is no feedback or undo mechanism if pressed by mistake.
   - There is no screen or section in the app to view opted-out questions, making `PromptCard`'s "Reactivar" button unreachable dead code.

---

## 2. Requirements & Solution Architecture

### A. Generic Reusable Toast System (`@/components`)

- **Scope**: App-wide, decoupled, accessible toast primitive.
- **Provider & Hook**:
  - `ToastProvider` mounted at root layout (`apps/mobile/src/app/_layout.tsx`).
  - `useToast()` hook exposing:
    ```ts
    show: (options: {
      message: string;
      action?: { label: string; onPress: () => void };
      duration?: number;
      variant?: "default" | "success" | "warning" | "destructive";
    }) => void;
    hide: () => void;
    ```
- **UI & Accessibility**:
  - Floating pill overlay positioned with safe-area insets (`useSafeAreaInsets`).
  - Animated enter/exit transitions.
  - Strict a11y labels: `accessibilityRole="alert"`, `accessibilityLiveRegion="polite"`.
  - Design tokens from `@/theme` (colors, spacing, shadows, radius).

### B. Opt-Out Recovery & Collapsible Paused Section

1. **Repository & Port Extensions**:
   - Add `getOptedOutRoutineQuestions(userId: EntityId): Promise<ReflectionQuestion[]>` to `ReflectionRepositoryPort` and `SqliteReflectionRepository`.
2. **Hook Extension (`useDailyReflections`)**:
   - Fetch and expose `optedOutRoutineQuestions: ReflectionQuestion[]`.
   - Update `refresh` to load opted-out questions in parallel.
3. **UI Integration (`reflections.tsx`)**:
   - **Immediate Undo Toast**: When tapping "Bajar", trigger toast:
     - Message: `"Pregunta dada de baja de tu rutina"`
     - Action: `{ label: "Deshacer", onPress: () => toggleRoutineOptOut(question.id, true) }`
   - **Collapsible Section**: At the bottom of `Cola Diaria`, render a section:
     - Header: `"Preguntas pausadas (N)"` with chevron toggle.
     - When expanded: renders `PromptCard` with `isRoutine={true}` and `isRoutineEnabled={false}`.
     - Tapping "Reactivar" re-enables the question and shows a confirmation toast (`"Pregunta reactivada en tu rutina"`).

---

## 3. Affected Areas

- `apps/mobile/src/components/toast/`:
  - `toast-context.tsx`: Context, Provider, `useToast` hook.
  - `toast-banner.tsx`: Animated floating presentational component.
  - `index.ts`: Export to `@/components`.
- `apps/mobile/src/app/_layout.tsx`:
  - Wrap app with `ToastProvider`.
- `apps/mobile/src/features/reflections/domain/ports/reflection.repository.port.ts`:
  - Declare `getOptedOutRoutineQuestions`.
- `apps/mobile/src/features/reflections/infrastructure/sqlite-reflection.repository.ts`:
  - Implement `getOptedOutRoutineQuestions`.
- `apps/mobile/src/features/reflections/hooks/use-daily-reflections.ts`:
  - Load and expose `optedOutRoutineQuestions`.
- `apps/mobile/src/app/(tabs)/reflections.tsx`:
  - Wire toast undo action and render collapsible "Preguntas pausadas" section.
- Unit and integration tests for repository, hook, and toast component.
