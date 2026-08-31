# Change Specification: Multiplatform Meditation Session

## 1. Requirements

### REQ-MED-001: Background Execution Resilience

The application SHALL continue countdown and fire the session completion alert regardless of device screen lock, battery optimization, or backgrounding.

### REQ-MED-002: Non-Interactive Lockscreen Display

The Android persistent notification SHALL display the target completion time without interactive playback controls.

### REQ-MED-003: Single Source of Truth

`SessionParams` SHALL take exclusively `targetDate: Date`, deriving formatted strings internally.

### REQ-MED-004: Multiplatform Parity

- **Android**: Background Foreground Service with `WakeLock`.
- **iOS**: Background Audio Session + Local Notification fallback.
- **Web**: HTML5 / Window Timers + Lazy Module resolution.

### REQ-MED-005: DND State Detection

Prompt user during Moment 1 if Android Do Not Disturb is disabled.
