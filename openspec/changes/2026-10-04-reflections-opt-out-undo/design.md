# Design: Daily Reflections Routine Opt-Out Undo & Generic Toast

## 1. System Architecture & Component Design

### 1.1 Toast Component Architecture (`@/components/toast`)

```
App Root (_layout.tsx)
  └── ToastProvider (State: activeToast, timerRef)
        ├── AppNavigation (Screens & Tabs)
        └── ToastBanner (Floating Animated Overlay, Safe Area aware)
```

#### TypeScript Contracts (`apps/mobile/src/components/toast/types.ts`)

```ts
export type ToastVariant = "default" | "success" | "warning" | "destructive";

export interface ToastAction {
  label: string;
  onPress: () => void;
}

export interface ToastOptions {
  id?: string;
  message: string;
  action?: ToastAction;
  duration?: number; // ms, default: 4000
  variant?: ToastVariant;
}

export interface ToastContextValue {
  show: (options: ToastOptions) => void;
  hide: () => void;
}
```

#### `ToastProvider` & Hook (`apps/mobile/src/components/toast/toast-context.tsx`)

- Maintains current active toast in state.
- Automatically clears previous dismiss timer before starting a new one.
- Exposes `useToast()` hook with safety assertion ensuring usage within provider.

#### `ToastBanner` (`apps/mobile/src/components/toast/toast-banner.tsx`)

- Positioned absolutely at the bottom with z-index overlay.
- Uses `useSafeAreaInsets().bottom` ensuring visibility above tab bars and native home bars.
- Uses React Native `Animated` for opacity and slide-up interpolation (`translateY`).
- Accessibility: `accessibilityRole="alert"`, `accessibilityLiveRegion="polite"`.

---

### 1.2 Reflections Repository & Port Extensions

#### Port (`apps/mobile/src/features/reflections/domain/ports/reflection.repository.port.ts`)

```ts
getOptedOutRoutineQuestions(userId: EntityId): Promise<ReflectionQuestion[]>;
```

#### SQLite Adapter (`apps/mobile/src/features/reflections/infrastructure/sqlite-reflection.repository.ts`)

```ts
async getOptedOutRoutineQuestions(userId: EntityId): Promise<ReflectionQuestion[]> {
  const rows = await this.db.getAllAsync<RawQuestion>(
    `SELECT q.id, q.category_id, q.theme_id, q.prompt, q.periodicity, q.preferred_time_of_day, q.response_type, q.config, q.is_default_suggested, q.order_index, q.created_at
     FROM reflection_questions q
     JOIN user_question_preferences p ON p.question_id = q.id AND p.user_id = ?
     WHERE q.periodicity = 'daily' AND q.theme_id IS NULL AND p.is_enabled = 0
     ORDER BY q.preferred_time_of_day ASC, q.order_index ASC`,
    [userId],
  );
  return rows.map((r) => this.mapQuestion(r));
}
```

---

### 1.3 Hook Integration (`use-daily-reflections.ts`)

- Stores `optedOutRoutineQuestions: ReflectionQuestion[]` in state.
- Inside `refresh()`:
  - Fetches `repository.getOptedOutRoutineQuestions(currentUser.id)` concurrently with other queries.
  - Updates `setOptedOutRoutineQuestions(optedOut)`.

---

### 1.4 Daily Queue Screen (`reflections.tsx`)

#### Opt-Out Handler with Immediate Toast Undo

```ts
const handleToggleRoutineOptOut = useCallback(
  async (questionId: EntityId, isEnabled: boolean) => {
    await toggleRoutineOptOut(questionId, isEnabled);
    if (!isEnabled) {
      toast.show({
        message: "Pregunta dada de baja de tu rutina",
        action: {
          label: "Deshacer",
          onPress: () => void toggleRoutineOptOut(questionId, true),
        },
      });
    } else {
      toast.show({
        message: "Pregunta reactivada en tu rutina",
        variant: "success",
      });
    }
  },
  [toggleRoutineOptOut, toast],
);
```

#### Collapsible Paused Section

- Rendered after completed reflections in `currentTab === "daily"`.
- If `optedOutRoutineQuestions.length > 0`:
  - Renders section header with pressable toggle: `"Preguntas pausadas (${optedOutRoutineQuestions.length})"`.
  - When expanded, maps items to `<PromptCard>` with `isRoutine={true}`, `isRoutineEnabled={false}`, and `onToggleOptOut={(enabled) => void handleToggleRoutineOptOut(q.id, enabled)}`.
