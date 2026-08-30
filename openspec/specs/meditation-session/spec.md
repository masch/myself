# Capability: Multiplatform Meditation Session

## 1. Overview

The Meditation Session capability orchestrates timed meditation sequences across 3 distinct moments (Reflection, Meditation, Integration/Closing) while guaranteeing background execution and accurate completion alerts across Android, iOS, and Web.

## 2. Requirements & Scenarios

### REQ-1: Domain Contract Decoupling

- The presentation layer (`src/app/(tabs)/meditation.tsx`) and the custom hook (`src/hooks/use-meditation.ts`) SHALL interact exclusively with `IMeditationSessionService`.
- `SessionParams` SHALL accept `targetDate: Date` as the single source of truth.

### REQ-2: Android Background Execution (Doze Mode Immunity)

- When the user locks the screen or backgrounds the app during active meditation (Moment 2), Android SHALL NOT suspend timers or kill audio.
- The app SHALL run a native `MeditationForegroundService` with `android:foregroundServiceType="mediaPlayback"` and acquire a `PowerManager.PARTIAL_WAKE_LOCK`.
- The notification displayed on the lockscreen SHALL be persistent (`ongoing = true`), visible on the lockscreen (`VISIBILITY_PUBLIC`), and informative (`Momento 2 · Finaliza a las HH:mm`).
- The notification SHALL NOT display interactive media playback buttons (play, pause, skip).

### REQ-3: iOS Background Execution

- iOS SHALL configure `AVAudioSession` with `.playback` category to allow background completion audio.
- The session SHALL schedule a local notification in `UNUserNotificationCenter` matching `targetDate` as an OS-level fallback.

### REQ-4: Web Compatibility

- Web bundlers SHALL NOT attempt to execute native Android/iOS binary modules.
- The platform resolution SHALL provide a lazy service (`WebMeditationSessionService`) and a mock module registered via `registerWebModule`.

### REQ-5: Do Not Disturb (DND) Detection

- The app SHALL detect whether Do Not Disturb mode is active on Android using `NotificationManager.currentInterruptionFilter`.
- If DND is inactive during Moment 1, the app SHALL display a gentle reminder banner to minimize distractions.
