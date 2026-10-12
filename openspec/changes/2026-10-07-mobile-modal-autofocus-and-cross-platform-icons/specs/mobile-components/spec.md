# Mobile Components Specification Extension

## Purpose

Enhances mobile component primitives (`AppBottomSheetModal`, `ThemedTextInput`, `AppIcon`) with lifecycle-coordinated autofocus and cross-platform icon rendering.

## Requirements

### Requirement: Modal Lifecycle Autofocus Synchronization

The design system MUST coordinate input focus requests with modal entrance transitions so that the virtual keyboard reliably opens without OS race condition drops.

#### Scenario: Synchronize autofocus with modal presentation onShow

- GIVEN a `ThemedTextInput` with `autoFocus={true}` mounted inside `AppBottomSheetModal`
- WHEN the modal is opened
- THEN the system MUST suppress immediate premature native autofocus
- AND WHEN the modal triggers its native `onShow` event upon completing slide-in transition
- THEN the system MUST focus the input and present the keyboard cleanly

#### Scenario: Fallback autofocus outside modal

- GIVEN a `ThemedTextInput` with `autoFocus={true}` mounted outside any modal container
- WHEN the component mounts
- THEN the system MUST trigger native autofocus behavior immediately without waiting for modal lifecycle events

### Requirement: Cross-Platform Native and Fallback Icons

The `AppIcon` component MUST render symbols reliably on all supported target platforms (iOS, Android, and Web) without showing empty or missing icon boxes.

#### Scenario: Native SF Symbol rendering on iOS

- GIVEN the app is running on iOS
- WHEN `AppIcon` is called with an `sf:` symbol name
- THEN the system MUST render the native SF Symbol via `expo-image`

#### Scenario: Styled glyph fallback on Android and Web

- GIVEN the app is running on Android or Web
- WHEN `AppIcon` is called with an `sf:` symbol name
- THEN the system MUST resolve a mapped typography/vector glyph
- AND the system MUST apply the requested `color` and `size` styling accurately

### Requirement: Keyboard Submission Shortcuts & Accessory Actions

The design system MUST support non-mouse quick submissions via keyboard shortcuts (`Ctrl+Enter`, `Cmd+Enter`) and a thumb-accessible floating action bar above the virtual keyboard.

#### Scenario: Desktop and hardware keyboard submit shortcut

- GIVEN a user typing inside `ThemedTextInput` or `ItemListInput`
- WHEN the user presses `Ctrl+Enter` (Windows/Linux/Android) or `Cmd+Enter` (macOS/iOS)
- THEN the system MUST trigger `onSubmitShortcut` and persist the response without requiring mouse or touch interactions

#### Scenario: Mobile virtual keyboard floating accessory bar

- GIVEN a modal response form open on a mobile device
- WHEN the software keyboard is active and visible
- THEN the system MUST display a compact accessory action bar directly above the keyboard with a thumb-accessible "Guardar" button complying with 44px HIG touch targets
