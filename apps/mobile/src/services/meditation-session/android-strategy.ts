import {
  addSessionCompletedListener,
  addSessionErrorListener,
  startMeditationSession,
  stopMeditationSession,
} from "@/modules/meditation-session";
import { MeditationNotificationService } from "../meditation-notification.service";
import type { IMeditationSessionService, SessionParams } from "./types";

export class AndroidMeditationSessionService implements IMeditationSessionService {
  async startSession(params: SessionParams): Promise<void> {
    await this.stopSession();

    const epochMs = params.targetDate.toMillis();
    const timeFormatted = params.targetDate.toLocalTimeHHMM();

    // 1. Start Android Foreground Service with WakeLock and ongoing lockscreen notification
    startMeditationSession({
      targetEpochMs: epochMs,
      targetTimeFormatted: timeFormatted,
    });

    // 2. Schedule fallback local notification
    await MeditationNotificationService.scheduleNotification(params.targetDate);
  }

  async stopSession(): Promise<void> {
    stopMeditationSession();
    await MeditationNotificationService.cancelAllNotifications();
  }

  subscribeCompletion(onCompleted: () => void): () => void {
    const subNative = addSessionCompletedListener(onCompleted);
    const unsubNotifications =
      MeditationNotificationService.subscribeNotificationEvents(onCompleted);

    return () => {
      subNative.remove();
      unsubNotifications();
    };
  }

  subscribeError(onError: (error: string) => void): () => void {
    const subNative = addSessionErrorListener((event) => {
      onError(event.error);
    });

    return () => {
      subNative.remove();
    };
  }
}
