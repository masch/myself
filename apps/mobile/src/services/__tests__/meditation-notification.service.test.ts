import { describe, expect, it, mock, beforeEach } from "bun:test";
import { Platform } from "react-native";
import { mockNotifications } from "../../../test-setup";
import {
  MeditationNotificationService,
  MEDITATION_NOTIFICATION_CHANNEL_ID,
  MEDITATION_NOTIFICATION_TYPE,
} from "../meditation-notification.service";

describe("MeditationNotificationService", () => {
  beforeEach(() => {
    mockNotifications.getPermissionsAsync.mockReset();
    mockNotifications.getPermissionsAsync.mockImplementation(async () => ({
      status: "granted",
    }));

    mockNotifications.requestPermissionsAsync.mockReset();
    mockNotifications.requestPermissionsAsync.mockImplementation(async () => ({
      status: "granted",
    }));

    mockNotifications.scheduleNotificationAsync.mockReset();
    mockNotifications.scheduleNotificationAsync.mockImplementation(
      async () => "scheduled-123",
    );

    mockNotifications.cancelAllScheduledNotificationsAsync.mockReset();
    mockNotifications.cancelScheduledNotificationAsync.mockReset();
    mockNotifications.setNotificationChannelAsync.mockReset();
    mockNotifications.addNotificationReceivedListener.mockReset();
    mockNotifications.addNotificationResponseReceivedListener.mockReset();
  });

  it("setupNotificationChannel configures android notification channel when platform is android", async () => {
    (Platform as any).OS = "android";
    await MeditationNotificationService.setupNotificationChannel();
    expect(mockNotifications.setNotificationChannelAsync).toHaveBeenCalledWith(
      MEDITATION_NOTIFICATION_CHANNEL_ID,
      expect.objectContaining({
        name: "Notificaciones de Meditación",
      }),
    );
  });

  it("setupNotificationChannel skips configuration when platform is iOS or web", async () => {
    (Platform as any).OS = "ios";
    await MeditationNotificationService.setupNotificationChannel();
    expect(
      mockNotifications.setNotificationChannelAsync,
    ).not.toHaveBeenCalled();
    (Platform as any).OS = "android";
  });

  it("schedules notification successfully when permissions are granted", async () => {
    const targetDate = new Date(Date.now() + 60000);
    const id =
      await MeditationNotificationService.scheduleNotification(targetDate);

    expect(id).toBe("scheduled-123");
    expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          data: { type: MEDITATION_NOTIFICATION_TYPE },
        }),
      }),
    );
  });

  it("requests permissions if not granted, and returns null if denied", async () => {
    mockNotifications.getPermissionsAsync.mockImplementationOnce(async () => ({
      status: "undetermined",
    }));
    mockNotifications.requestPermissionsAsync.mockImplementationOnce(
      async () => ({ status: "denied" }),
    );

    const targetDate = new Date(Date.now() + 60000);
    const id =
      await MeditationNotificationService.scheduleNotification(targetDate);

    expect(id).toBeNull();
  });

  it("cancels all scheduled notifications", async () => {
    await MeditationNotificationService.cancelAllNotifications();
    expect(
      mockNotifications.cancelAllScheduledNotificationsAsync,
    ).toHaveBeenCalled();
  });

  it("cancels individual notification by ID", async () => {
    await MeditationNotificationService.cancelNotification("scheduled-123");
    expect(
      mockNotifications.cancelScheduledNotificationAsync,
    ).toHaveBeenCalledWith("scheduled-123");

    await MeditationNotificationService.cancelNotification(null);
  });

  it("subscribeNotificationEvents hooks notification arrivals and responses", () => {
    let receivedCallback: ((n: any) => void) | undefined;
    let responseCallback: ((r: any) => void) | undefined;

    mockNotifications.addNotificationReceivedListener.mockImplementationOnce(
      (cb: (n: any) => void) => {
        receivedCallback = cb;
        return { remove: mock(() => {}) };
      },
    );

    mockNotifications.addNotificationResponseReceivedListener.mockImplementationOnce(
      (cb: (r: any) => void) => {
        responseCallback = cb;
        return { remove: mock(() => {}) };
      },
    );

    const onTriggered = mock(() => {});
    const unsub =
      MeditationNotificationService.subscribeNotificationEvents(onTriggered);

    // Matching notification triggers callback
    receivedCallback?.({
      request: {
        content: {
          data: { type: MEDITATION_NOTIFICATION_TYPE },
        },
      },
    });
    expect(onTriggered).toHaveBeenCalledTimes(1);

    // Non-matching notification ignored
    receivedCallback?.({
      request: {
        content: {
          data: { type: "other" },
        },
      },
    });
    expect(onTriggered).toHaveBeenCalledTimes(1);

    // Matching response triggers callback
    responseCallback?.({
      notification: {
        request: {
          content: {
            data: { type: MEDITATION_NOTIFICATION_TYPE },
          },
        },
      },
    });
    expect(onTriggered).toHaveBeenCalledTimes(2);

    unsub();
  });
});
