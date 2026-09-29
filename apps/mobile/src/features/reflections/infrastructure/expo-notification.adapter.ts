import type * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { getNotifications } from "@/services/notifications/notifications-runtime";
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
    const notifications = getNotifications();
    if (!notifications) return;

    try {
      await notifications.setNotificationChannelAsync(
        REFLECTIONS_NOTIFICATION_CHANNEL_ID,
        {
          name: "Reflexiones Diarias",
          importance: notifications.AndroidImportance.HIGH,
          enableLights: true,
          enableVibrate: true,
          lockscreenVisibility:
            notifications.AndroidNotificationVisibility.PUBLIC,
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
    const notifications = getNotifications();
    if (!notifications) return false;

    try {
      const { status: existingStatus } =
        await notifications.getPermissionsAsync();
      if (existingStatus === "granted") {
        return true;
      }
      const { status } = await notifications.requestPermissionsAsync();
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
    const notifications = getNotifications();
    if (!notifications) return null;

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
        type: notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId:
          Platform.OS === "android"
            ? REFLECTIONS_NOTIFICATION_CHANNEL_ID
            : undefined,
      };

      const notificationId = await notifications.scheduleNotificationAsync({
        content: {
          title: "Momento de Reflexión",
          body: promptPreview,
          priority: notifications.AndroidNotificationPriority.HIGH,
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
    const notifications = getNotifications();
    if (!notifications) return;

    try {
      await notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (err) {
      console.warn(`Failed to cancel notification ${notificationId}:`, err);
    }
  }

  async cancelReminderForQuestion(questionId: string): Promise<void> {
    const notifications = getNotifications();
    if (!notifications) return;

    try {
      const scheduled = await notifications.getAllScheduledNotificationsAsync();
      const matching = scheduled.filter(
        (req) => req.content.data?.questionId === questionId,
      );
      for (const req of matching) {
        await notifications.cancelScheduledNotificationAsync(req.identifier);
      }
    } catch (err) {
      console.warn(
        `Failed to cancel notification for question ${questionId}:`,
        err,
      );
    }
  }
}
