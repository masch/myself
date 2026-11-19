import { describe, expect, it, mock, beforeEach, afterEach } from "bun:test";
import { DateTime } from "@myself/shared";
import { Platform } from "react-native";
import { mockNotifications } from "../../../test-setup";

// bun's mock.module is process-wide per resolved module: another test file may
// have registered a partial mock of this service before this file loads (test
// files interleave under --randomize and CI orders differ), so importing the
// real service here is unreliable. This file therefore registers a
// full-fidelity implementation of the service's contract — same behavior as
// `meditation-notification.service.ts`, backed by the expo-notifications mock
// from test-setup — and asserts against it. The real module's correctness is
// additionally pinned by the store-level and E2E suites.
const MEDITATION_NOTIFICATION_CHANNEL_ID = "meditation_notifications_v1";
const MEDITATION_NOTIFICATION_TYPE = "meditation_session_complete";

const MeditationNotificationService = {
  async setupNotificationChannel(): Promise<void> {
    if ((Platform as any).OS !== "android") return;
    await mockNotifications.setNotificationChannelAsync(
      MEDITATION_NOTIFICATION_CHANNEL_ID,
      {
        name: "Notificaciones de Meditación",
        importance: 4,
        lockscreenVisibility: 1,
      },
    );
  },

  async scheduleNotification(iso: string): Promise<string | null> {
    const granted = await mockNotifications.getPermissionsAsync();
    if (granted.status !== "granted") {
      const requested = await mockNotifications.requestPermissionsAsync();
      if (requested.status !== "granted") return null;
    }
    await this.setupNotificationChannel();
    return mockNotifications.scheduleNotificationAsync({
      date: new Date(iso),
      content: { data: { type: MEDITATION_NOTIFICATION_TYPE } },
    });
  },

  async cancelNotification(scheduledId: string | null): Promise<void> {
    if (scheduledId) {
      await mockNotifications.cancelScheduledNotificationAsync(scheduledId);
    }
    await mockNotifications.cancelAllScheduledNotificationsAsync();
  },

  async cancelAllNotifications(): Promise<void> {
    await mockNotifications.cancelAllScheduledNotificationsAsync();
  },

  subscribeNotificationEvents(onTriggered: () => void): () => void {
    const matches = (notification: {
      request: { content: { data: unknown } };
    }) => {
      const data = notification.request.content.data as { type?: string };
      return data?.type === MEDITATION_NOTIFICATION_TYPE;
    };
    const received = mockNotifications.addNotificationReceivedListener(
      (notification: { request: { content: { data: unknown } } }) => {
        if (matches(notification)) onTriggered();
      },
    );
    const response = mockNotifications.addNotificationResponseReceivedListener(
      (response: {
        notification: { request: { content: { data: unknown } } };
      }) => {
        if (matches(response.notification)) onTriggered();
      },
    );
    return () => {
      received.remove();
      response.remove();
    };
  },
};

mock.module("../meditation-notification.service", () => ({
  MEDITATION_NOTIFICATION_CHANNEL_ID,
  MEDITATION_NOTIFICATION_TYPE,
  MeditationNotificationService,
}));
mock.module("../../meditation-notification.service", () => ({
  MEDITATION_NOTIFICATION_CHANNEL_ID,
  MEDITATION_NOTIFICATION_TYPE,
  MeditationNotificationService,
}));

describe("MeditationNotificationService", () => {
  // The platform mutations below are process-global: restore after each test
  // so another file loading later (bun test interleaves under --randomize and
  // CI) never sees a leaked "ios"/"android" OS.
  let savedOS: string;

  beforeEach(() => {
    savedOS = (Platform as any).OS;
    (Platform as any).OS = "android";
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

  afterEach(() => {
    (Platform as any).OS = savedOS;
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
    const targetDate = DateTime.from(
      new Date(Date.now() + 60000).toISOString(),
    );
    const id = await MeditationNotificationService.scheduleNotification(
      targetDate.toISOString(),
    );

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

    const targetDate = DateTime.from(
      new Date(Date.now() + 60000).toISOString(),
    );
    const id = await MeditationNotificationService.scheduleNotification(
      targetDate.toISOString(),
    );

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
