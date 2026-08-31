import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export const MEDITATION_NOTIFICATION_CHANNEL_ID = "meditation_notifications_v1";
export const MEDITATION_NOTIFICATION_TYPE = "meditation_session_complete";

// Configure global notification presentation
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false, // Audio is managed directly by expo-audio
    shouldSetBadge: false,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

export const MeditationNotificationService = {
  /**
   * Configures standard Android notification channel.
   */
  async setupNotificationChannel(): Promise<void> {
    if (Platform.OS !== "android") return;

    try {
      await Notifications.setNotificationChannelAsync(
        MEDITATION_NOTIFICATION_CHANNEL_ID,
        {
          name: "Notificaciones de Meditación",
          importance: Notifications.AndroidImportance.HIGH,
          enableLights: true,
          enableVibrate: true,
          lockscreenVisibility:
            Notifications.AndroidNotificationVisibility.PUBLIC,
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
    targetDate: Date,
    title = "Momento 3: Cierre e Integración",
    body = "Se cumplió la hora programada de la meditación.",
  ): Promise<string | null> {
    try {
      const { status: permStatus } = await Notifications.getPermissionsAsync();
      if (permStatus !== "granted") {
        const requested = await Notifications.requestPermissionsAsync();
        if (requested.status !== "granted") {
          return null;
        }
      }

      const diffSeconds = Math.max(
        1,
        Math.round((targetDate.getTime() - Date.now()) / 1000),
      );

      await this.cancelAllNotifications();
      await this.setupNotificationChannel();

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: { type: MEDITATION_NOTIFICATION_TYPE },
          ...(Platform.OS === "android"
            ? {
                channelId: MEDITATION_NOTIFICATION_CHANNEL_ID,
                color: "#208AEF",
              }
            : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
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
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (err) {
      console.warn("Failed to cancel scheduled notifications:", err);
    }
  },

  /**
   * Cancels a scheduled notification by ID.
   */
  async cancelNotification(scheduledId: string | null): Promise<void> {
    if (!scheduledId) return;
    try {
      await Notifications.cancelScheduledNotificationAsync(scheduledId);
    } catch (err) {
      console.warn("Failed to cancel scheduled notification:", err);
    }
  },

  /**
   * Subscribes to notification arrivals and interactions.
   */
  subscribeNotificationEvents(onTriggered: () => void): () => void {
    const subReceived = Notifications.addNotificationReceivedListener(
      (notification) => {
        if (
          notification.request.content.data?.type ===
          MEDITATION_NOTIFICATION_TYPE
        ) {
          onTriggered();
        }
      },
    );

    const subResponse = Notifications.addNotificationResponseReceivedListener(
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
