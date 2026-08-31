# Technical Design: Multiplatform Meditation Session Architecture

## 1. System Architecture

```
src/app/(tabs)/meditation.tsx (UI)
       │
       ▼
src/hooks/use-meditation.ts (Hook)
       │
       ▼
src/services/meditation-session/types.ts (IMeditationSessionService)
       │
  ┌────┼───────────────────────────┐
  ▼    ▼                           ▼
AndroidStrategy                IosStrategy                 WebStrategy
  │                                │                           │
  ▼                                ▼                           ▼
MeditationForegroundService     AVAudioSession              Browser Timers
+ WakeLock + NotificationCompat + UNUserNotificationCenter
```

## 2. Component Design

### 2.1 Native Module (`modules/meditation-session`)

- **Package**: `org.masch.myself.meditationsession`
- **Android**: `MeditationForegroundService.kt` acquires `PowerManager.PARTIAL_WAKE_LOCK` (4-hour safety limit) and creates a low-importance notification channel with `NotificationCompat.Builder`.
- **iOS**: `MeditationSessionModule.swift` schedules main-thread timer and triggers `onSessionCompleted` events.
- **Web**: `MeditationSessionModule.web.ts` exports a mock NativeModule using `registerWebModule`.

### 2.2 Domain Strategy Layer (`src/services/meditation-session/`)

- `LazyMeditationSessionService`: Lazily resolves `AndroidMeditationSessionService`, `IosMeditationSessionService`, or `WebMeditationSessionService` depending on `Platform.OS`.
- Formats notification text using `formatClock(params.targetDate)`.

### 2.3 Do Not Disturb Module (`modules/dnd-status`)

- **Package**: `org.masch.myself.dndstatus`
- Exposes `isDndActive()`, `isSupported()`, `isNotificationPolicyAccessGranted()`, `setDndActive(active)`, and `openDndSettings()`.
