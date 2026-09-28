# Feature: Bottom Sheet Android Insets & Navigation Bar Translucency

## Objective

Fix bottom overlap on Android native where the system 3-button navigation bar (48dp) overlaps action buttons inside bottom sheet modals, while dynamically omitting the bottom safe area inset when the software keyboard is active so that no redundant empty gap appears above the keyboard.

## Problem & Why

1. In Android edge-to-edge mode, `AppBottomSheetModal` renders inside a separate native Android `Dialog` window outside the root `SafeAreaProvider`. In the parent Activity, content does not overlap the navigation bar so `useSafeAreaInsets().bottom` returned 0. Furthermore, `<Modal>` lacked `navigationBarTranslucent`, causing action buttons to render under the system navigation bar when closed.
2. When the software keyboard (e.g. Gboard) is opened, `KeyboardAvoidingView` pushes the modal upwards above the keyboard. However, if the sheet unconditionally applies `SafeAreaView edges={["bottom"]}`, the 48dp navigation bar inset is added above the keyboard, creating an unsightly gap between the action buttons ("Cancelar" / "Guardar") and the keyboard.

## Scope & Constraints

- Update `apps/mobile/src/components/bottom-sheet-modal.tsx`:
  - Encapsulate `<SafeAreaProvider style={{ flex: 1 }}>` and `<Modal navigationBarTranslucent>`.
  - Extract `<BottomSheetBody>` with `useIsKeyboardVisible` tracking software keyboard show/hide events.
  - Apply `edges={isKeyboardVisible ? [] : ["bottom"]}` via `getBottomSheetSafeAreaEdges`.
- Update unit tests in `apps/mobile/src/components/__tests__/bottom-sheet-modal.test.tsx` to verify `navigationBarTranslucent`, `BottomSheetBody`, and edge calculations.
- Ensure 100% test pass rate across unit tests and Playwright E2E browser tests.

## Tasks

- [x] TASK-1: Add `SafeAreaProvider`, `navigationBarTranslucent`, and `BottomSheetBody` to `AppBottomSheetModal` in `bottom-sheet-modal.tsx`.
- [x] TASK-2: Track software keyboard visibility to dynamically set `edges={isKeyboardVisible ? [] : ["bottom"]}`, eliminating redundant gap when keyboard is open.
- [x] TASK-3: Update `bottom-sheet-modal.test.tsx` to verify `navigationBarTranslucent`, `BottomSheetBody`, and dynamic bottom insets.
- [x] TASK-4: Verify all quality gates (`bun run test`, `bun run check`, `make check-odd`, `make check-e2e-browser`).

## Verification Evidence

- `bun test src/components/__tests__/bottom-sheet-modal.test.tsx`: 8/8 unit tests passed (21 assertions).
- `bun run test` (apps/mobile): 212 unit tests passed across 28 files (670 assertions).
- `bun run check`: All 9/9 turbo tasks passed (typecheck, lint, test, format).
- `make check-odd`: All ODD task documents completed and closed.
- `make check-e2e-browser`: 5/5 Playwright E2E browser tests passed.

- **Completion & Delivery**:
  - Encapsulated `<SafeAreaProvider>` inside `<Modal>` and used `<SafeAreaView edges={getBottomSheetSafeAreaEdges(isKeyboardVisible)}>` inside `<BottomSheetBody>` in `apps/mobile/src/components/bottom-sheet-modal.tsx`.
  - Added `useIsKeyboardVisible()` hook listening to `keyboardDidShow`, `keyboardDidHide`, `keyboardWillShow`, and `keyboardWillHide` so the 48dp inset is applied only when the modal rests on the bottom navigation bar and dynamically stripped when floating above the software keyboard.
  - Verified edge transitions and updated unit tests in `bottom-sheet-modal.test.tsx`.
  - Delivery committed to feature branch `feat/53-design-system` on PR [#58](https://github.com/masch/myself/pull/58).
