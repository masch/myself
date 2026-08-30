import { describe, expect, it, mock, beforeEach } from "bun:test";

const mockStart = mock((_opts: any) => true);
const mockStop = mock(() => true);
const mockIsActive = mock(() => true);
const mockAddListener = mock((_event: string, _cb: any) => ({
  remove: mock(() => {}),
}));

mock.module("../src/MeditationSessionModule", () => ({
  default: {
    startSession: mockStart,
    stopSession: mockStop,
    isSessionActive: mockIsActive,
    addListener: mockAddListener,
  },
}));

import {
  startMeditationSession,
  stopMeditationSession,
  isMeditationSessionActive,
  addSessionCompletedListener,
  addSessionErrorListener,
} from "../index";

describe("MeditationSessionModule Wrapper Functions", () => {
  beforeEach(() => {
    mockStart.mockClear();
    mockStop.mockClear();
    mockIsActive.mockClear();
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
});
