import { MEDITATION_SOUNDS } from "@/constants/sounds";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export const MEDITATION_ALARM_CHANNEL_ID = "meditation_alarm_channel_v3";
export const MEDITATION_ALARM_TYPE = "meditation_alarm";

// Configure global notification presentation
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

export const MeditationAlarmService = {
  /**
   * Configures the native Android alarm notification channel.
   */
  async setupNotificationChannel(): Promise<void> {
    if (Platform.OS !== "android") return;

    try {
      await Notifications.setNotificationChannelAsync(
        MEDITATION_ALARM_CHANNEL_ID,
        {
          name: "Meditation Alarms",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 500, 200, 500],
          sound: MEDITATION_SOUNDS.SINGLE_GONG.fileName,
          enableLights: true,
          enableVibrate: true,
          lockscreenVisibility:
            Notifications.AndroidNotificationVisibility.PUBLIC,
          bypassDnd: true,
          audioAttributes: {
            usage: Notifications.AndroidAudioUsage.ALARM,
            contentType: Notifications.AndroidAudioContentType.SONIFICATION,
            flags: {
              enforceAudibility: true,
              requestHardwareAudioVideoSynchronization: false,
            },
          },
        },
      );
    } catch (err) {
      console.warn("Failed to create Android meditation alarm channel:", err);
    }
  },

  /**
   * Schedules a high-priority exact alarm notification for full-screen wake.
   */
  async scheduleAlarm(
    targetDate: Date,
    title = "Momento 3: Cierre e Integración",
    body = "Se cumplió la hora programada de la meditación.",
  ): Promise<string | null> {
    try {
      const { status: permStatus } = await Notifications.getPermissionsAsync();
      if (permStatus !== "granted") {
        const requested = await Notifications.requestPermissionsAsync();
        if (requested.status !== "granted") {
          console.warn("Notification permissions not granted on Android/iOS");
          return null;
        }
      }

      const diffSeconds = Math.max(
        1,
        Math.round((targetDate.getTime() - Date.now()) / 1000),
      );

      // Cancel any existing scheduled alarms first to avoid conflicts
      await this.cancelAllAlarms();

      // Ensure channel is ready before scheduling
      await this.setupNotificationChannel();

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: MEDITATION_SOUNDS.SINGLE_GONG.fileName,
          categoryIdentifier: "alarm",
          priority: Notifications.AndroidNotificationPriority.MAX,
          data: { type: MEDITATION_ALARM_TYPE },
          ...(Platform.OS === "android"
            ? {
                channelId: MEDITATION_ALARM_CHANNEL_ID,
                color: "#208AEF",
                vibrationPattern: [0, 500, 200, 500],
              }
            : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: diffSeconds,
          repeats: false,
          ...(Platform.OS === "android"
            ? { channelId: MEDITATION_ALARM_CHANNEL_ID }
            : {}),
        },
      });

      return id;
    } catch (err) {
      console.warn("Failed to schedule meditation alarm:", err);
      return null;
    }
  },

  /**
   * Cancels all scheduled alarm notifications.
   */
  async cancelAllAlarms(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (err) {
      console.warn("Failed to cancel scheduled alarms:", err);
    }
  },

  /**
   * Cancels a scheduled alarm notification by ID.
   */
  async cancelAlarm(scheduledId: string | null): Promise<void> {
    if (!scheduledId) return;
    try {
      await Notifications.cancelScheduledNotificationAsync(scheduledId);
    } catch (err) {
      console.warn("Failed to cancel scheduled meditation alarm:", err);
    }
  },

  /**
   * Subscribes to notification arrivals and responses.
   */
  subscribeAlarmEvents(onAlarmTriggered: () => void): () => void {
    const subReceived = Notifications.addNotificationReceivedListener(
      (notification) => {
        if (notification.request.content.data?.type === MEDITATION_ALARM_TYPE) {
          onAlarmTriggered();
        }
      },
    );

    const subResponse = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        if (
          response.notification.request.content.data?.type ===
          MEDITATION_ALARM_TYPE
        ) {
          onAlarmTriggered();
        }
      },
    );

    return () => {
      subReceived.remove();
      subResponse.remove();
    };
  },
};
