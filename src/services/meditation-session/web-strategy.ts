import { MeditationNotificationService } from "../meditation-notification.service";
import type { IMeditationSessionService, SessionParams } from "./types";

export class WebMeditationSessionService implements IMeditationSessionService {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private listeners: (() => void)[] = [];

  async startSession(params: SessionParams): Promise<void> {
    await this.stopSession();

    const delayMs = Math.max(0, params.targetDate.getTime() - Date.now());

    this.timer = setTimeout(() => {
      this.listeners.forEach((listener) => listener());
    }, delayMs);

    await MeditationNotificationService.scheduleNotification(params.targetDate);
  }

  async stopSession(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    await MeditationNotificationService.cancelAllNotifications();
  }

  subscribeCompletion(onCompleted: () => void): () => void {
    this.listeners.push(onCompleted);
    const unsubNotifications =
      MeditationNotificationService.subscribeNotificationEvents(onCompleted);

    return () => {
      this.listeners = this.listeners.filter((l) => l !== onCompleted);
      unsubNotifications();
    };
  }
}
