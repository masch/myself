# Toast System Specification

## Purpose

Defines a generic, accessible, lightweight notification banner system for displaying non-blocking transient alerts, feedback, and action triggers across the mobile application.

## Requirements

### Requirement: Toast Presentation and Auto-dismiss

The system MUST provide a unified context and hook (`useToast`) allowing any screen or component to present a floating alert with a message, visual variant, and configurable auto-dismiss duration.

#### Scenario: Display standard notification toast

- GIVEN the application is mounted with `ToastProvider`
- WHEN a component calls `toast.show({ message: "Action completed" })`
- THEN the system MUST render a floating banner displaying the message
- AND the system MUST automatically dismiss the banner after the configured duration (default: 4000ms)

#### Scenario: Dismiss existing toast when hide is called

- GIVEN an active toast displayed on screen
- WHEN `toast.hide()` is called or a new toast is shown
- THEN the system MUST hide the previous toast banner

### Requirement: Interactive Action Support

The system MUST support an optional interactive action within the toast banner (such as "Deshacer"), executing a callback when pressed and dismissing the toast.

#### Scenario: Trigger action callback on button tap

- GIVEN an active toast with `action: { label: "Deshacer", onPress: callback }`
- WHEN the user taps the action button
- THEN the system MUST invoke `callback()`
- AND the system MUST dismiss the toast banner immediately

### Requirement: Accessibility and Screen Positioning

The toast banner MUST respect platform safe areas and announce alerts to screen readers.

#### Scenario: Screen reader announcement

- GIVEN screen reader / accessibility services enabled
- WHEN a toast is displayed
- THEN the banner MUST declare `accessibilityRole="alert"` and `accessibilityLiveRegion="polite"`
