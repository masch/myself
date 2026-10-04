import {
  addSessionCompletedListener,
  addSessionErrorListener,
  startMeditationSession,
  stopMeditationSession,
} from "@/modules/meditation-session";
import { MeditationNotificationService } from "../meditation-notification.service";
import { DateTime } from "@myself/shared";
import type { IMeditationSessionService, SessionParams } from "./types";

function formatClock(date: Date): string {
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

export class IosMeditationSessionService implements IMeditationSessionService {
  async startSession(params: SessionParams): Promise<void> {
    await this.stopSession();

    const epochMs =
      params.targetDate instanceof DateTime
        ? params.targetDate.toMillis()
        : params.targetDate.getTime();
    const timeFormatted =
      params.targetDate instanceof DateTime
        ? params.targetDate.toLocalTimeHHMM()
        : formatClock(params.targetDate);

    // 1. Start timer in Swift native module
    startMeditationSession({
      targetEpochMs: epochMs,
      targetTimeFormatted: timeFormatted,
    });

    // 2. Schedule iOS local notification in UNUserNotificationCenter
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
