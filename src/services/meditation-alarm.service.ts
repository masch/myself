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
        await Notifications.requestPermissionsAsync();
      }

      const now = new Date();
      if (targetDate.getTime() <= now.getTime()) {
        return null;
      }

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
              }
            : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: targetDate,
        },
      });

      return id;
    } catch (err) {
      console.warn("Failed to schedule meditation alarm:", err);
      return null;
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
