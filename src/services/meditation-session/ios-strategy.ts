import {
  addSessionCompletedListener,
  startMeditationSession,
  stopMeditationSession,
} from "@/modules/meditation-session";
import { MeditationNotificationService } from "../meditation-notification.service";
import type { IMeditationSessionService, SessionParams } from "./types";

function formatClock(date: Date): string {
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

export class IosMeditationSessionService implements IMeditationSessionService {
  async startSession(params: SessionParams): Promise<void> {
    await this.stopSession();

    // 1. Iniciar temporizador en módulo Swift
    startMeditationSession({
      targetEpochMs: params.targetDate.getTime(),
      targetTimeFormatted: formatClock(params.targetDate),
    });

    // 2. Programar notificación de iOS en UNUserNotificationCenter
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
}
