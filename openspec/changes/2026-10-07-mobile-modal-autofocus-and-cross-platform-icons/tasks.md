# Tasks: Mobile Modal Input Autofocus Lifecycle & Cross-Platform Icons

- **Change**: `2026-10-07-mobile-modal-autofocus-and-cross-platform-icons`
- **Execution Mode**: `interactive`
- **Artifact Store**: `hybrid`
- **Delivery Strategy**: `ask-on-risk`
- **Budget**: `400` lines

---

## 1. Modal Lifecycle & Autofocus Coordination

- [x] 1.1 Expose `ModalLifecycle` context and propagate native `onShow` in `apps/mobile/src/components/bottom-sheet-modal.tsx`.
- [x] 1.2 Integrate deferred autofocus in `apps/mobile/src/components/themed-text-input.tsx` via `BottomSheetModalContext`.
- [x] 1.3 Enable default row 0 autofocus in `apps/mobile/src/features/reflections/components/ItemListInput.tsx`.
- [x] 1.4 Add unit tests in `bottom-sheet-modal.test.tsx` and `themed-text-input.test.tsx`.

## 2. Cross-Platform AppIcon Implementation

- [x] 2.1 Update `apps/mobile/src/components/app-icon.tsx` with `Platform.OS !== "ios"` fallback glyph map for Android.
- [x] 2.2 Expand glyph map in `apps/mobile/src/components/app-icon.constants.ts` and `app-icon.web.tsx` covering all active app icons (`sf:star`, `sf:star.fill`, `sf:trash.fill`, `sf:exclamationmark.triangle.fill`).
- [x] 2.3 Ensure trash delete icon renders cleanly with `colors.systemRed` in `ItemListInput.tsx`.
- [x] 2.4 Add unit tests verifying `AppIcon` resolution in `app-icon.test.tsx`.

## 3. Verification & Compliance

- [x] 3.1 Run canonical verification suite (`make check`) covering tests, types, lint, format, and expo-doctor.
- [x] 3.2 Generate and publish verify report with exact requirement and scenario counts.
