import { describe, expect, it, mock, beforeEach } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { getTargetDate, useMeditation } from "../use-meditation";

// Mock sound assets
mock.module("../constants/sounds", () => ({
  MEDITATION_SOUNDS: {
    SINGLE_GONG: 1,
    TRIPLE_GONG: 2,
  },
}));

mock.module("@/constants/sounds", () => ({
  MEDITATION_SOUNDS: {
    SINGLE_GONG: 1,
    TRIPLE_GONG: 2,
  },
}));

// Mock audio player
const mockPlay = mock(() => {});
const mockSeekTo = mock(async () => {});
mock.module("expo-audio", () => ({
  useAudioPlayer: () => ({
    play: mockPlay,
    seekTo: mockSeekTo,
  }),
  setAudioModeAsync: async () => {},
}));

// Mock MeditationSessionService
const mockServiceStart = mock(async () => {});
const mockServiceStop = mock(async () => {});

mock.module("@/services/meditation-session", () => ({
  MeditationSessionService: {
    startSession: mockServiceStart,
    stopSession: mockServiceStop,
    subscribeCompletion: () => () => {},
    subscribeError: () => () => {},
  },
}));

describe("getTargetDate Wall-Clock Calculation", () => {
  it("schedules for today if target time is in the future", () => {
    const now = new Date(2026, 7, 30, 10, 0, 0);
    const target = getTargetDate(now, 10, 30);

    expect(target.getFullYear()).toBe(2026);
    expect(target.getMonth()).toBe(7);
    expect(target.getDate()).toBe(30);
    expect(target.getHours()).toBe(10);
    expect(target.getMinutes()).toBe(30);
    expect(target.getTime()).toBeGreaterThan(now.getTime());
  });

  it("rolls over to tomorrow if target time for today has already passed", () => {
    const now = new Date(2026, 7, 30, 10, 0, 0);
    const target = getTargetDate(now, 8, 30);

    expect(target.getFullYear()).toBe(2026);
    expect(target.getMonth()).toBe(7);
    expect(target.getDate()).toBe(31);
    expect(target.getHours()).toBe(8);
    expect(target.getMinutes()).toBe(30);
    expect(target.getTime()).toBeGreaterThan(now.getTime());
  });

  it("handles midnight crossing correctly (overnight meditation)", () => {
    const now = new Date(2026, 7, 30, 23, 50, 0);
    const target = getTargetDate(now, 0, 15);

    expect(target.getFullYear()).toBe(2026);
    expect(target.getMonth()).toBe(7);
    expect(target.getDate()).toBe(31);
    expect(target.getHours()).toBe(0);
    expect(target.getMinutes()).toBe(15);
    expect(target.getTime() - now.getTime()).toBe(25 * 60 * 1000);
  });

  it("rolls over if target is exact same second as current time", () => {
    const now = new Date(2026, 7, 30, 8, 0, 0);
    const target = getTargetDate(now, 8, 0);

    expect(target.getDate()).toBe(31);
    expect(target.getHours()).toBe(8);
    expect(target.getMinutes()).toBe(0);
  });
});

function HookTestHarness({
  onRender,
}: {
  onRender: (hook: ReturnType<typeof useMeditation>) => void;
}) {
  const result = useMeditation();
  onRender(result);
  return null;
}

describe("useMeditation State Machine & Lifecycle", () => {
  beforeEach(() => {
    mockPlay.mockClear();
    mockSeekTo.mockClear();
    mockServiceStart.mockClear();
    mockServiceStop.mockClear();
  });

  it("initializes in idle state with 3 moments", () => {
    let hookState!: ReturnType<typeof useMeditation>;
    renderToString(
      React.createElement(HookTestHarness, {
        onRender: (h) => {
          hookState = h;
        },
      }),
    );

    expect(hookState.status).toBe("idle");
    expect(hookState.currentMomentIndex).toBe(0);
    expect(hookState.moments.length).toBe(3);
    expect(hookState.isLastMoment).toBe(false);
    expect(hookState.isWaitingForScheduledTime).toBe(false);
  });

  it("allows setting target time, moments and toggling alarm", () => {
    let hookState!: ReturnType<typeof useMeditation>;
    renderToString(
      React.createElement(HookTestHarness, {
        onRender: (h) => {
          hookState = h;
        },
      }),
    );

    hookState.setTargetHour(7);
    hookState.setTargetMinute(45);
    hookState.setAlarmEnabled(false);
    hookState.setMoments(["M1", "M2"]);
  });

  it("starts session and resets session", async () => {
    let hookState!: ReturnType<typeof useMeditation>;
    renderToString(
      React.createElement(HookTestHarness, {
        onRender: (h) => {
          hookState = h;
        },
      }),
    );

    await hookState.startSession();
    expect(mockServiceStop).toHaveBeenCalled();
    expect(mockPlay).toHaveBeenCalled();

    await hookState.resetSession();
    expect(mockServiceStop).toHaveBeenCalledTimes(2);
  });

  it("handles sound playback errors gracefully", async () => {
    let hookState!: ReturnType<typeof useMeditation>;
    renderToString(
      React.createElement(HookTestHarness, {
        onRender: (h) => {
          hookState = h;
        },
      }),
    );

    mockPlay.mockImplementationOnce(() => {
      throw new Error("Audio error");
    });
    await hookState.playSingleGong();

    mockPlay.mockImplementationOnce(() => {
      throw new Error("Audio error");
    });
    await hookState.playTripleGong();
  });
});
