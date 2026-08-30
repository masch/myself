# Change Proposal: Multiplatform Meditation Session & Native Background Runner

## 1. Problem Statement

During active meditation (Moment 2), when the user locks their device or backgrounds the application, JavaScript execution is frozen by operating system power management (Android Doze Mode). This prevented the timer from progressing and stopped the closing gong alarm from sounding at the scheduled completion time.

Furthermore, existing off-the-shelf solutions like `react-native-track-player` force `MediaStyle` notification layouts with play/pause/skip buttons, which degrades the tranquil, non-interactive user experience required for meditation.

## 2. Proposed Solution

1. **Local Native Module (`modules/meditation-session`)**:
   - Implement an Android `ForegroundService` with `PARTIAL_WAKE_LOCK` and `NotificationCompat` ongoing lockscreen notification showing completion target time with zero action buttons.
   - Implement an iOS Swift module coordinating timers and `AVAudioSession`.
   - Provide a safe Web mock registered with `registerWebModule`.
2. **Clean Architecture Strategy Layer (`src/services/meditation-session/`)**:
   - Define domain contract `IMeditationSessionService` with `SessionParams { targetDate: Date }`.
   - Provide isolated concrete implementations for `Android`, `iOS`, and `Web` using lazy factory instantiation.
3. **Do Not Disturb Awareness (`modules/dnd-status`)**:
   - Create a local native module querying `NotificationManager.currentInterruptionFilter` to gently prompt users when DND is off.
4. **Hook Decoupling**:
   - Refactor `useMeditation` to consume the domain service contract rather than low-level OS APIs.
