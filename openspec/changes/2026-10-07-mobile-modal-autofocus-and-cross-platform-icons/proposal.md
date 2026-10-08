# Proposal: Mobile Modal Input Autofocus Lifecycle & Cross-Platform Icons

## Intent

Deliver an immediate and frictionless answering experience across all reflection questions by synchronizing input autofocus with modal entrance transitions, while ensuring action and delete buttons across the mobile design system are clearly visible and styled on Android, iOS, and Web.

## Scope

### In Scope

- **Modal Lifecycle & Autofocus Coordination (`@/components`)**:
  - `ModalLifecycle` context within `AppBottomSheetModal` driven by native `onShow`.
  - `ThemedTextInput` deferred focus integration to eliminate iOS/Android keyboard presentation drops during modal slide-in.
  - Initial row autofocus in `ItemListInput` for rapid response entry.
- **Cross-Platform Icon System (`@/components/app-icon`)**:
  - Native SF Symbols on iOS via `expo-image`.
  - Robust, colored glyph rendering on Android and Web for all `sf:...` symbols, ensuring trash, pin, edit, and status icons are never invisible.
  - Complete coverage for active application symbols (`sf:trash`, `sf:trash.fill`, `sf:star`, `sf:star.fill`, `sf:exclamationmark.triangle.fill`).

### Out of Scope

- Modifying SQLite schema or backend APIs (purely UI/Design System enhancement).
- Replacing `expo-image` for general remote or asset image loading.

## Capabilities

### Modified Capabilities

- `mobile-components`: `AppBottomSheetModal`, `ThemedTextInput`, and `AppIcon` primitives enhanced for robust cross-platform mobile and web rendering.
- `personal-reflections`: Instant keyboard focus on modal presentation and visible item deletion actions.

## Approach

1. **Modal Lifecycle Context**: `AppBottomSheetModal` registers a lightweight event channel emitting on native `onShow`. `ThemedTextInput` listens and executes `.focus()` at the exact moment the modal becomes visible, falling back gracefully if outside a modal.
2. **Item List Entry**: `ItemListInput` activates `autoFocus` for its first item row by default.
3. **Cross-Platform AppIcon**: Update `app-icon.tsx` with platform checks (`Platform.OS === 'ios' ? expo-image : glyph-map`) and expand `SF_WEB_MAP` in `app-icon.web.tsx` to support all active app icons with precise color and size styling.
4. **Verification**: Validate unit and visual component tests using `make check`.
