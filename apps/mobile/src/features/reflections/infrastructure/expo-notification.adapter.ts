import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { NotificationServicePort } from "../domain/ports/notification.service.port";

export const REFLECTIONS_NOTIFICATION_CHANNEL_ID =
  "reflections_notifications_v1";
export const REFLECTIONS_NOTIFICATION_TYPE = "daily_reflection_reminder";

export class ExpoNotificationAdapter implements NotificationServicePort {
  private channelInitialized = false;

  private async ensureChannel(): Promise<void> {
    if (this.channelInitialized || Platform.OS !== "android") {
      return;
    }

    try {
      await Notifications.setNotificationChannelAsync(
        REFLECTIONS_NOTIFICATION_CHANNEL_ID,
        {
          name: "Reflexiones Diarias",
          importance: Notifications.AndroidImportance.HIGH,
          enableLights: true,
          enableVibrate: true,
          lockscreenVisibility:
            Notifications.AndroidNotificationVisibility.PUBLIC,
        },
      );
      this.channelInitialized = true;
    } catch (err) {
      console.warn(
        "Failed to create reflections Android notification channel:",
        err,
      );
    }
  }

  async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      if (existingStatus === "granted") {
        return true;
      }
      const { status } = await Notifications.requestPermissionsAsync();
      return status === "granted";
    } catch (err) {
      console.warn("Failed to request notification permissions:", err);
      return false;
    }
  }

  async scheduleDailyReminder(
    questionId: string,
    timeOfDay: string,
    promptPreview: string,
  ): Promise<string | null> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      return null;
    }

    await this.ensureChannel();

    const [hoursStr, minutesStr] = timeOfDay.split(":");
    const hour = parseInt(hoursStr ?? "8", 10);
    const minute = parseInt(minutesStr ?? "0", 10);

    if (isNaN(hour) || isNaN(minute)) {
      console.warn(`Invalid timeOfDay format: ${timeOfDay}`);
      return null;
    }

    try {
      await this.cancelReminderForQuestion(questionId);

      const trigger: Notifications.DailyTriggerInput = {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId:
          Platform.OS === "android"
            ? REFLECTIONS_NOTIFICATION_CHANNEL_ID
            : undefined,
      };

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: "Momento de Reflexión",
          body: promptPreview,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: {
            type: REFLECTIONS_NOTIFICATION_TYPE,
            questionId,
          },
          ...(Platform.OS === "android"
            ? {
                channelId: REFLECTIONS_NOTIFICATION_CHANNEL_ID,
                color: "#208AEF",
              }
            : {}),
        },
        trigger,
      });

      return notificationId;
    } catch (err) {
      console.warn("Failed to schedule reflection notification:", err);
      return null;
    }
  }

  async cancelReminder(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (err) {
      console.warn(`Failed to cancel notification ${notificationId}:`, err);
    }
  }

  async cancelReminderForQuestion(questionId: string): Promise<void> {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const matching = scheduled.filter(
        (req) => req.content.data?.questionId === questionId,
      );
      for (const req of matching) {
        await Notifications.cancelScheduledNotificationAsync(req.identifier);
      }
    } catch (err) {
      console.warn(
        `Failed to cancel notification for question ${questionId}:`,
        err,
      );
    }
  }
}
