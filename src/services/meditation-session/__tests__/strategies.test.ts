import { describe, expect, it, mock, beforeEach } from "bun:test";
import { AndroidMeditationSessionService } from "../android-strategy";
import { IosMeditationSessionService } from "../ios-strategy";
import { WebMeditationSessionService } from "../web-strategy";
import { MeditationSessionService } from "../index";

// Mock native module
const mockStartSession = mock(() => true);
const mockStopSession = mock(() => true);
const mockAddCompletedListener = mock((_cb: () => void) => ({
  remove: mock(() => {}),
}));
const mockAddErrorListener = mock((_cb: (e: { error: string }) => void) => ({
  remove: mock(() => {}),
}));

mock.module("@/modules/meditation-session", () => ({
  startMeditationSession: mockStartSession,
  stopMeditationSession: mockStopSession,
  addSessionCompletedListener: mockAddCompletedListener,
  addSessionErrorListener: mockAddErrorListener,
}));

// Mock MeditationNotificationService with both aliases
const mockSchedule = mock(async () => "notif-id-1");
const mockCancelAll = mock(async () => {});
const mockSubscribeEvents = mock((_cb: () => void) => mock(() => {}));

mock.module("../../meditation-notification.service", () => ({
  MeditationNotificationService: {
    scheduleNotification: mockSchedule,
    cancelAllNotifications: mockCancelAll,
    subscribeNotificationEvents: mockSubscribeEvents,
  },
}));

mock.module("../meditation-notification.service", () => ({
  MeditationNotificationService: {
    scheduleNotification: mockSchedule,
    cancelAllNotifications: mockCancelAll,
    subscribeNotificationEvents: mockSubscribeEvents,
  },
}));

describe("AndroidMeditationSessionService", () => {
  let service: AndroidMeditationSessionService;

  beforeEach(() => {
    service = new AndroidMeditationSessionService();
    mockStartSession.mockClear();
    mockStopSession.mockClear();
    mockSchedule.mockClear();
    mockCancelAll.mockClear();
    mockAddCompletedListener.mockClear();
    mockSubscribeEvents.mockClear();
  });

  it("starts session and schedules notifications", async () => {
    const targetDate = new Date(2026, 7, 30, 8, 30);
    await service.startSession({ targetDate });

    expect(mockStopSession).toHaveBeenCalled();
    expect(mockStartSession).toHaveBeenCalledWith({
      targetEpochMs: targetDate.getTime(),
      targetTimeFormatted: "08:30",
    });
    expect(mockSchedule).toHaveBeenCalledWith(targetDate);
  });

  it("stops session and cancels all notifications", async () => {
    await service.stopSession();
    expect(mockStopSession).toHaveBeenCalled();
    expect(mockCancelAll).toHaveBeenCalled();
  });

  it("subscribes to completion events and unregisters listeners", () => {
    const onCompleted = mock(() => {});
    const unsub = service.subscribeCompletion(onCompleted);

    expect(mockAddCompletedListener).toHaveBeenCalledWith(onCompleted);
    expect(mockSubscribeEvents).toHaveBeenCalledWith(onCompleted);

    unsub();
  });

  it("subscribes to native error events and unsubscribes cleanly", () => {
    const onError = mock((_err: string) => {});
    let capturedCallback: ((e: { error: string }) => void) | undefined;
    mockAddErrorListener.mockImplementationOnce(
      (cb: (e: { error: string }) => void) => {
        capturedCallback = cb;
        return { remove: mock(() => {}) };
      },
    );

    const unsub = service.subscribeError(onError);
    expect(mockAddErrorListener).toHaveBeenCalled();

    capturedCallback?.({ error: "WakeLock error" });
    expect(onError).toHaveBeenCalledWith("WakeLock error");

    unsub();
  });
});

describe("IosMeditationSessionService", () => {
  let service: IosMeditationSessionService;

  beforeEach(() => {
    service = new IosMeditationSessionService();
    mockStartSession.mockClear();
    mockStopSession.mockClear();
    mockSchedule.mockClear();
    mockCancelAll.mockClear();
  });

  it("starts session and schedules local notifications", async () => {
    const targetDate = new Date(2026, 7, 30, 14, 5);
    await service.startSession({ targetDate });

    expect(mockStopSession).toHaveBeenCalled();
    expect(mockStartSession).toHaveBeenCalledWith({
      targetEpochMs: targetDate.getTime(),
      targetTimeFormatted: "14:05",
    });
    expect(mockSchedule).toHaveBeenCalledWith(targetDate);
  });

  it("stops session", async () => {
    await service.stopSession();
    expect(mockStopSession).toHaveBeenCalled();
    expect(mockCancelAll).toHaveBeenCalled();
  });

  it("subscribes to completion", () => {
    const onCompleted = mock(() => {});
    const unsub = service.subscribeCompletion(onCompleted);
    expect(mockAddCompletedListener).toHaveBeenCalled();
    unsub();
  });

  it("subscribes to error", () => {
    const onError = mock((_err: string) => {});
    const unsub = service.subscribeError(onError);
    expect(mockAddErrorListener).toHaveBeenCalled();
    unsub();
  });
});

describe("WebMeditationSessionService", () => {
  let service: WebMeditationSessionService;

  beforeEach(() => {
    service = new WebMeditationSessionService();
    mockSchedule.mockClear();
    mockCancelAll.mockClear();
  });

  it("starts session with setTimeout and executes listeners on timeout", async () => {
    const onCompleted = mock(() => {});
    const unsub = service.subscribeCompletion(onCompleted);

    const targetDate = new Date(Date.now() + 30);
    await service.startSession({ targetDate });
    expect(mockSchedule).toHaveBeenCalledWith(targetDate);

    await new Promise((r) => setTimeout(r, 50));
    expect(onCompleted).toHaveBeenCalled();

    unsub();
  });

  it("clears timer on stopSession", async () => {
    const targetDate = new Date(Date.now() + 100);
    await service.startSession({ targetDate });
    await service.stopSession();

    expect(mockCancelAll).toHaveBeenCalled();
  });

  it("subscribeError returns no-op cleanup", () => {
    const onError = mock(() => {});
    const unsub = service.subscribeError(onError);
    expect(typeof unsub).toBe("function");
    unsub();
    expect(onError).not.toHaveBeenCalled();
  });
});

describe("LazyMeditationSessionService (Delegation)", () => {
  it("delegates startSession, stopSession, and subscriptions according to platform", async () => {
    const targetDate = new Date(2026, 7, 30, 9, 0);

    await MeditationSessionService.startSession({ targetDate });
    await MeditationSessionService.stopSession();

    const unsubComp = MeditationSessionService.subscribeCompletion(() => {});
    const unsubErr = MeditationSessionService.subscribeError(() => {});

    expect(typeof unsubComp).toBe("function");
    expect(typeof unsubErr).toBe("function");

    unsubComp();
    unsubErr();
  });
});
