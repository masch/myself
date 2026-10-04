import { Platform } from "react-native";
import { DateTime } from "@myself/shared";
import { getNotifications } from "./notifications/notifications-runtime";

export const MEDITATION_NOTIFICATION_CHANNEL_ID = "meditation_notifications_v1";
export const MEDITATION_NOTIFICATION_TYPE = "meditation_session_complete";

// Configure global notification presentation
const initialNotifications = getNotifications();
if (initialNotifications) {
  initialNotifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false, // Audio is managed directly by expo-audio
      shouldSetBadge: false,
      priority: initialNotifications.AndroidNotificationPriority.HIGH,
    }),
  });
}

export const MeditationNotificationService = {
  /**
   * Configures standard Android notification channel.
   */
  async setupNotificationChannel(): Promise<void> {
    if (Platform.OS !== "android") return;
    const notifications = getNotifications();
    if (!notifications) return;

    try {
      await notifications.setNotificationChannelAsync(
        MEDITATION_NOTIFICATION_CHANNEL_ID,
        {
          name: "Notificaciones de Meditación",
          importance: notifications.AndroidImportance.HIGH,
          enableLights: true,
          enableVibrate: true,
          lockscreenVisibility:
            notifications.AndroidNotificationVisibility.PUBLIC,
        },
      );
    } catch (err) {
      console.warn("Failed to create Android notification channel:", err);
    }
  },

  /**
   * Schedules a standard notification when meditation target time is reached.
   */
  async scheduleNotification(
    targetDate: DateTime | Date,
    title = "Momento 3: Cierre e Integración",
    body = "Se cumplió la hora programada de la meditación.",
  ): Promise<string | null> {
    const notifications = getNotifications();
    if (!notifications) return null;

    try {
      const { status: permStatus } = await notifications.getPermissionsAsync();
      if (permStatus !== "granted") {
        const requested = await notifications.requestPermissionsAsync();
        if (requested.status !== "granted") {
          return null;
        }
      }

      const epochMs =
        "toMillis" in targetDate ? targetDate.toMillis() : targetDate.getTime();
      const diffSeconds = Math.max(
        1,
        Math.round((epochMs - DateTime.now().toMillis()) / 1000),
      );

      await this.cancelAllNotifications();
      await this.setupNotificationChannel();

      const id = await notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          priority: notifications.AndroidNotificationPriority.HIGH,
          data: { type: MEDITATION_NOTIFICATION_TYPE },
          ...(Platform.OS === "android"
            ? {
                channelId: MEDITATION_NOTIFICATION_CHANNEL_ID,
                color: "#208AEF",
              }
            : {}),
        },
        trigger: {
          type: notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: diffSeconds,
          repeats: false,
          ...(Platform.OS === "android"
            ? { channelId: MEDITATION_NOTIFICATION_CHANNEL_ID }
            : {}),
        },
      });

      return id;
    } catch (err) {
      console.warn("Failed to schedule meditation notification:", err);
      return null;
    }
  },

  /**
   * Cancels all scheduled meditation notifications.
   */
  async cancelAllNotifications(): Promise<void> {
    const notifications = getNotifications();
    if (!notifications) return;

    try {
      await notifications.cancelAllScheduledNotificationsAsync();
    } catch (err) {
      console.warn("Failed to cancel scheduled notifications:", err);
    }
  },

  /**
   * Cancels a scheduled notification by ID.
   */
  async cancelNotification(scheduledId: string | null): Promise<void> {
    if (!scheduledId) return;
    const notifications = getNotifications();
    if (!notifications) return;

    try {
      await notifications.cancelScheduledNotificationAsync(scheduledId);
    } catch (err) {
      console.warn("Failed to cancel scheduled notification:", err);
    }
  },

  /**
   * Subscribes to notification arrivals and interactions.
   */
  subscribeNotificationEvents(onTriggered: () => void): () => void {
    const notifications = getNotifications();
    if (!notifications) return () => {};

    const subReceived = notifications.addNotificationReceivedListener(
      (notification) => {
        if (
          notification.request.content.data?.type ===
          MEDITATION_NOTIFICATION_TYPE
        ) {
          onTriggered();
        }
      },
    );

    const subResponse = notifications.addNotificationResponseReceivedListener(
      (response) => {
        if (
          response.notification.request.content.data?.type ===
          MEDITATION_NOTIFICATION_TYPE
        ) {
          onTriggered();
        }
      },
    );

    return () => {
      subReceived.remove();
      subResponse.remove();
    };
  },
};
