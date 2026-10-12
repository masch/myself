# Exploration: Mobile Modal Input Autofocus Lifecycle & Cross-Platform Icons

- **Change**: `2026-10-07-mobile-modal-autofocus-and-cross-platform-icons`
- **Execution Mode**: `interactive`
- **Artifact Store**: `hybrid`
- **Delivery Strategy**: `ask-on-risk`
- **Budget**: `400` lines

---

## 1. Current State & Root Cause Analysis

### A. Modal Input Autofocus Issues

1. **Timing & Native Animation Race Condition**:
   - In React Native on iOS/Android, `<Modal animationType="slide">` runs an asynchronous window presentation transition.
   - If an inner `<TextInput autoFocus />` requests focus while the modal view controller is actively sliding in, the operating system (specifically iOS UIKit first responder logic) rejects or drops the focus request.
2. **Missing Autofocus in ItemListInput**:
   - In `apps/mobile/src/features/reflections/components/ItemListInput.tsx`, rows did not declare `autoFocus`, requiring an explicit additional tap from the user to start typing.
3. **Decoupled Lifecycle Solution**:
   - `AppBottomSheetModal` must coordinate with its children via a lightweight `ModalLifecycle` context (`BottomSheetModalContext`) triggered by the native `<Modal onShow>` callback.
   - `ThemedTextInput` intercepts `autoFocus` when mounted within a modal: it defers `.focus()` until `onShow` fires (with an idempotent fallback timeout), preventing premature focus attempts.
   - `ItemListInput` exposes `autoFocusFirstItem` (default `true`) so row 0 automatically receives focus on presentation.

### B. Invisible Icons on Android & Web (SF Symbols Assumption)

1. **Platform Restriction in AppIcon**:
   - In `apps/mobile/src/components/app-icon.tsx`, the native implementation relies exclusively on `expo-image` with `source={name}` (e.g. `source="sf:trash"`).
   - Apple SF Symbols (`sf:...`) are strictly iOS-only native assets. On Android, `expo-image` fails to resolve `sf:...` sources and silently renders an empty transparent box.
   - Consequently, delete buttons (`sf:trash` in `ItemListInput`, `reading-card.tsx`, `task-row.tsx`) and action icons (`sf:star.fill` in `PromptCard.tsx`) are completely invisible to users on Android devices.
2. **Web Fallback Gaps & Inconsistent Styling**:
   - In `apps/mobile/src/components/app-icon.web.tsx`, `SF_WEB_MAP` maps `"sf:trash"` to emoji `🗑`, which does not tint with CSS color tokens (`colors.systemRed`) and may fail on Linux systems lacking specific emoji fonts.
   - Key symbols like `"sf:star"`, `"sf:star.fill"`, and `"sf:exclamationmark.triangle.fill"` are missing entirely from the web map, defaulting to generic bullets (`•`).

---

## 2. Requirements & Solution Architecture

### A. Modal Input Autofocus (`@/components`)

- **`AppBottomSheetModal`**:
  - Expose `ModalLifecycle` via `BottomSheetModalContext`.
  - Wire native `onShow` to `notifyShow()`.
- **`ThemedTextInput`**:
  - Consume `useBottomSheetModalContext()`.
  - When `autoFocus` is active inside a modal, suppress premature native `autoFocus` and wait for `modalLifecycle.subscribe` / `onShow` to call `.focus()`.
- **`ItemListInput`**:
  - Expose `autoFocusFirstItem?: boolean` (default `true`).
  - Row 0 receives `autoFocus={autoFocusFirstItem && index === 0}`.

### B. True Cross-Platform AppIcon (`@/components`)

- **Unified Design System Primitive**:
  - Update `app-icon.tsx` to handle `Platform.OS !== "ios"` cleanly:
    - On iOS: Use `expo-image` with native SF Symbols.
    - On Android and Web: Render a clean, vector/text symbol map (`SF_GLYPH_MAP`) that responds correctly to typography size, line-height, and `tintColor` / `color` tokens (e.g. `colors.systemRed` for trash).
  - Expand the symbol map to include all active application icons:
    - `"sf:trash"` / `"sf:trash.fill"`: clean delete glyph (`✕` or crisp trash symbol).
    - `"sf:star"` / `"sf:star.fill"`: `☆` / `★`.
    - `"sf:pencil"`: `✎`.
    - `"sf:exclamationmark.triangle.fill"`: `⚠`.
    - All remaining navigation and status symbols.

---

## 3. Affected Areas

- `apps/mobile/src/components/bottom-sheet-modal.tsx`: Modal lifecycle context & `onShow` propagation.
- `apps/mobile/src/components/themed-text-input.tsx`: Deferred autofocus coordination.
- `apps/mobile/src/components/app-icon.tsx`: Cross-platform rendering for Android & iOS.
- `apps/mobile/src/components/app-icon.web.tsx`: Comprehensive glyph map & color fidelity.
- `apps/mobile/src/features/reflections/components/ItemListInput.tsx`: Default autofocus for initial item.
- Component unit tests under `apps/mobile/src/components/__tests__/`.
