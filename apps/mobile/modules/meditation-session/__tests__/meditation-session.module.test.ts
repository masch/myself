import { describe, expect, it, mock, beforeEach } from "bun:test";
import { mockMeditationSession } from "../../../test-setup";
import {
  startMeditationSession,
  stopMeditationSession,
  isMeditationSessionActive,
  playAlarmSound,
  stopAlarmSound,
  addSessionCompletedListener,
  addSessionErrorListener,
} from "../index";
import { createFallbackMeditationSessionModule } from "../src/MeditationSessionModule";

const mockStart = mockMeditationSession.startSession;
const mockStop = mockMeditationSession.stopSession;
const mockIsActive = mockMeditationSession.isSessionActive;
const mockPlayAlarm = mockMeditationSession.playAlarmSound;
const mockStopAlarm = mockMeditationSession.stopAlarmSound;
const mockAddListener = mockMeditationSession.addListener;

describe("MeditationSessionModule Wrapper Functions", () => {
  beforeEach(() => {
    mockStart.mockClear();
    mockStop.mockClear();
    mockIsActive.mockClear();
    mockPlayAlarm.mockClear();
    mockStopAlarm.mockClear();
    mockAddListener.mockClear();
  });

  it("startMeditationSession passes options and returns boolean", () => {
    const opts = { targetEpochMs: 123456789, targetTimeFormatted: "10:00" };
    expect(startMeditationSession(opts)).toBe(true);
    expect(mockStart).toHaveBeenCalledWith(opts);
  });

  it("startMeditationSession catches exceptions safely", () => {
    mockStart.mockImplementationOnce(() => {
      throw new Error("Crash");
    });
    expect(
      startMeditationSession({ targetEpochMs: 0, targetTimeFormatted: "" }),
    ).toBe(false);
  });

  it("stopMeditationSession stops session and handles errors", () => {
    expect(stopMeditationSession()).toBe(true);
    expect(mockStop).toHaveBeenCalled();

    mockStop.mockImplementationOnce(() => {
      throw new Error("Crash");
    });
    expect(stopMeditationSession()).toBe(false);
  });

  it("isMeditationSessionActive checks active status and handles errors", () => {
    expect(isMeditationSessionActive()).toBe(true);

    mockIsActive.mockImplementationOnce(() => {
      throw new Error("Crash");
    });
    expect(isMeditationSessionActive()).toBe(false);
  });

  it("playAlarmSound passes uri and volume and handles errors", () => {
    expect(playAlarmSound("file:///test.m4a", 0.8)).toBe(true);
    expect(mockPlayAlarm).toHaveBeenCalledWith("file:///test.m4a", 0.8);

    mockPlayAlarm.mockImplementationOnce(() => {
      throw new Error("Crash");
    });
    expect(playAlarmSound("file:///test.m4a", 0.8)).toBe(false);
  });

  it("stopAlarmSound stops alarm sound and handles errors", () => {
    expect(stopAlarmSound()).toBe(true);
    expect(mockStopAlarm).toHaveBeenCalled();

    mockStopAlarm.mockImplementationOnce(() => {
      throw new Error("Crash");
    });
    expect(stopAlarmSound()).toBe(false);
  });

  it("addSessionCompletedListener registers onSessionCompleted and handles errors", () => {
    const cb = mock(() => {});
    const sub = addSessionCompletedListener(cb);
    expect(mockAddListener).toHaveBeenCalledWith("onSessionCompleted", cb);
    sub.remove();

    mockAddListener.mockImplementationOnce(() => {
      throw new Error("Crash");
    });
    const fallbackSub = addSessionCompletedListener(cb);
    expect(typeof fallbackSub.remove).toBe("function");
    fallbackSub.remove();
  });

  it("addSessionErrorListener registers onSessionError and handles errors", () => {
    const cb = mock((_e: { error: string }) => {});
    const sub = addSessionErrorListener(cb);
    expect(mockAddListener).toHaveBeenCalledWith("onSessionError", cb);
    sub.remove();

    mockAddListener.mockImplementationOnce(() => {
      throw new Error("Crash");
    });
    const fallbackSub = addSessionErrorListener(cb);
    expect(typeof fallbackSub.remove).toBe("function");
    fallbackSub.remove();
  });

  it("createFallbackMeditationSessionModule provides safe defaults for unsupported environments", () => {
    const fallback = createFallbackMeditationSessionModule();
    expect(
      fallback.startSession({
        targetEpochMs: 1234,
        targetTimeFormatted: "10:00",
      }),
    ).toBe(false);
    expect(fallback.stopSession()).toBe(false);
    expect(fallback.isSessionActive()).toBe(false);
    expect(fallback.playAlarmSound("file:///test.m4a", 0.5)).toBe(false);
    expect(fallback.stopAlarmSound()).toBe(false);
    const sub = fallback.addListener("onSessionCompleted", () => {});
    expect(typeof sub.remove).toBe("function");
    sub.remove();
    expect(() =>
      fallback.removeListener("onSessionCompleted", () => {}),
    ).not.toThrow();
    expect(() =>
      fallback.removeAllListeners("onSessionCompleted"),
    ).not.toThrow();
  });
});
