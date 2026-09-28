# Feature: Bottom Sheet Android Insets & Navigation Bar Translucency

## Objective

Fix bottom overlap on Android native where the system 3-button navigation bar (48dp) overlaps action buttons inside bottom sheet modals by adding `useSafeAreaInsets` bottom padding and `navigationBarTranslucent` to `AppBottomSheetModal`.

## Problem & Why

In Android edge-to-edge mode, `AppBottomSheetModal` had a hardcoded `paddingBottom: spacing.md` (16dp) without accounting for `insets.bottom` (48dp on 3-button navigation, 16-24dp on gesture navigation, and 34dp on iOS home indicator). Furthermore, `<Modal>` lacked `navigationBarTranslucent`, causing action buttons ("Cancelar", "Guardar", etc.) to render directly under the system navigation buttons.

## Scope & Constraints

- Update `apps/mobile/src/components/bottom-sheet-modal.tsx` to use `useSafeAreaInsets()` and add `insets.bottom` to `styles.sheet`'s `paddingBottom`.
- Add `navigationBarTranslucent` to `<Modal>`.
- Update unit tests in `apps/mobile/src/components/__tests__/bottom-sheet-modal.test.tsx`.
- Ensure 100% test pass rate across unit tests and Playwright E2E browser tests.

## Tasks

- [x] TASK-1: Add `useSafeAreaInsets` and `navigationBarTranslucent` to `AppBottomSheetModal` in `bottom-sheet-modal.tsx`.
- [x] TASK-2: Update `bottom-sheet-modal.test.tsx` to verify `navigationBarTranslucent` and dynamic bottom insets.
- [x] TASK-3: Verify all quality gates (`bun run test`, `bun run check`, `make check-odd`, `make check-e2e-browser`).

## Verification Evidence

- `bun test src/components/__tests__/bottom-sheet-modal.test.tsx`: 5/5 unit tests passed.
- `bun run test` (apps/mobile): 209 unit tests passed across 28 files (666 assertions).
- `make check-odd`: All ODD task documents completed and closed.
- `make check-e2e-browser`: 5/5 Playwright E2E browser tests passed.

- **Completion & Delivery**:
  - Identified root cause: React Native `<Modal>` renders in a separate native Android `Dialog` window outside the root `SafeAreaProvider`. In the parent Activity (`reflections.tsx` inside `NativeTabs`), content does not overlap the navigation bar so `useSafeAreaInsets().bottom` returned 0.
  - Implemented `<SafeAreaProvider>` inside `<Modal>` and used `<SafeAreaView edges={["bottom"]}>` for the sheet container in `apps/mobile/src/components/bottom-sheet-modal.tsx`. This reads native Dialog window insets synchronously on pre-draw, adding the exact navigation bar height (48dp on 3-button nav) to sheet padding in native Yoga layout.
  - Updated unit test assertions in `bottom-sheet-modal.test.tsx` verifying the hierarchy (`Modal -> SafeAreaProvider -> KeyboardAvoidingView -> SafeAreaView[edges=["bottom"]]`).
  - Delivery committed to feature branch `feat/53-design-system` on PR [#58](https://github.com/masch/myself/pull/58).
