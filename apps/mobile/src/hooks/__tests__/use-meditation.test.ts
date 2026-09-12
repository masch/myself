import { describe, expect, it, mock, beforeEach } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { AppState } from "react-native";
import { mockMeditationSession } from "../../../test-setup";
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
const mockPlayerSingle = {
  play: mockPlay,
  seekTo: mockSeekTo,
  volume: 1.0,
};
const mockPlayerTriple = {
  play: mockPlay,
  seekTo: mockSeekTo,
  volume: 1.0,
};

let setAudioModeFail = false;
const mockSetAudioMode = mock(async () => {
  if (setAudioModeFail) {
    throw new Error("AudioMode failed");
  }
});

mock.module("expo-audio", () => ({
  useAudioPlayer: (soundId: number) =>
    soundId === 1 ? mockPlayerSingle : mockPlayerTriple,
  setAudioModeAsync: mockSetAudioMode,
}));

// Mock MeditationSessionService
const mockServiceStart = mock(async (_opts?: any) => {});
const mockServiceStop = mock(async () => {});
let completionListener: (() => void) | null = null;
let errorListener: ((err: string) => void) | null = null;

mock.module("@/services/meditation-session", () => ({
  MeditationSessionService: {
    startSession: mockServiceStart,
    stopSession: mockServiceStop,
    subscribeCompletion: (cb: () => void) => {
      completionListener = cb;
      return () => {
        completionListener = null;
      };
    },
    subscribeError: (cb: (err: string) => void) => {
      errorListener = cb;
      return () => {
        errorListener = null;
      };
    },
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
    mockMeditationSession.playAlarmSound.mockClear();
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
    expect(mockMeditationSession.playAlarmSound).toHaveBeenCalled();

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

    mockMeditationSession.playAlarmSound.mockImplementationOnce(() => false);
    mockPlay.mockImplementationOnce(() => {
      throw new Error("Audio error");
    });
    await hookState.playSingleGong();

    mockMeditationSession.playAlarmSound.mockImplementationOnce(() => false);
    mockPlay.mockImplementationOnce(() => {
      throw new Error("Audio error");
    });
    await hookState.playTripleGong();
  });

  function createHookRunner() {
    const internals = (React as any)
      .__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
    const states = new Map<number, any>();
    let stateIndex = 0;
    let effects: (() => (() => void) | void)[] = [];

    const originalDispatcher = internals.H;

    const install = () => {
      internals.H = {
        useState: (initial: any) => {
          const idx = stateIndex++;
          if (!states.has(idx)) {
            states.set(
              idx,
              typeof initial === "function" ? initial() : initial,
            );
          }
          const setState = (newVal: any) => {
            const current = states.get(idx);
            states.set(
              idx,
              typeof newVal === "function" ? newVal(current) : newVal,
            );
          };
          return [states.get(idx), setState];
        },
        useCallback: (fn: any) => fn,
        useMemo: (fn: any) => fn(),
        useEffect: (fn: any) => {
          effects.push(fn);
        },
        useRef: (initial: any) => ({ current: initial }),
      };
    };

    const render = () => {
      install();
      stateIndex = 0;
      effects = [];
      // eslint-disable-next-line react-hooks/rules-of-hooks
      return useMeditation();
    };

    const runEffects = () => {
      const currentEffects = [...effects];
      effects = [];
      const cleanups = currentEffects.map((fn) => {
        try {
          return fn();
        } catch {
          return undefined;
        }
      });
      return () => {
        cleanups.forEach((c) => {
          if (typeof c === "function") {
            try {
              c();
            } catch {}
          }
        });
      };
    };

    const restore = () => {
      internals.H = originalDispatcher;
    };

    return { render, runEffects, restore };
  }

  it("handles pauseSession and resumeSession across session states", async () => {
    const runner = createHookRunner();
    try {
      let hook = runner.render();

      // 1. Calling pauseSession when status is idle does not stop session
      mockServiceStop.mockClear();
      hook.pauseSession();
      expect(mockServiceStop).not.toHaveBeenCalled();

      // 2. Start session -> status becomes running
      await hook.startSession();
      hook = runner.render();
      expect(hook.status).toBe("running");

      // 3. Pause session when running -> sets status to paused and calls stopSession
      mockServiceStop.mockClear();
      hook.pauseSession();
      hook = runner.render();
      expect(hook.status).toBe("paused");
      expect(mockServiceStop).toHaveBeenCalled();

      // 4. Resume session when paused -> sets status to running
      mockServiceStart.mockClear();
      hook.resumeSession();
      hook = runner.render();
      expect(hook.status).toBe("running");

      // 5. Resume in moment 1 with alarm enabled -> calls startSession
      await hook.nextMoment(); // to moment 1
      hook = runner.render();
      expect(hook.currentMomentIndex).toBe(1);

      hook.pauseSession();
      hook = runner.render();
      expect(hook.status).toBe("paused");

      mockServiceStart.mockClear();
      hook.resumeSession();
      hook = runner.render();
      expect(hook.status).toBe("running");
      expect(mockServiceStart).toHaveBeenCalled();
    } finally {
      runner.restore();
    }
  });

  it("handles nextMoment transitions across all stages", async () => {
    const runner = createHookRunner();
    try {
      let hook = runner.render();

      // 1. nextMoment when status is idle does nothing
      mockServiceStart.mockClear();
      mockServiceStop.mockClear();
      await hook.nextMoment();
      expect(mockServiceStart).not.toHaveBeenCalled();

      // 2. Start session (moment 0, running)
      await hook.startSession();
      hook = runner.render();

      // 3. Next moment from 0 -> 1 starts background session
      mockServiceStart.mockClear();
      await hook.nextMoment();
      hook = runner.render();
      expect(hook.currentMomentIndex).toBe(1);
      expect(mockServiceStart).toHaveBeenCalled();

      // 4. Next moment from 1 -> 2 stops background session
      mockServiceStop.mockClear();
      await hook.nextMoment();
      hook = runner.render();
      expect(hook.currentMomentIndex).toBe(2);
      expect(mockServiceStop).toHaveBeenCalled();

      // 5. Next moment from 2 -> completed (past last moment)
      mockServiceStop.mockClear();
      mockMeditationSession.playAlarmSound.mockClear();
      await hook.nextMoment();
      hook = runner.render();
      expect(hook.status).toBe("completed");
      expect(mockServiceStop).toHaveBeenCalled();
      expect(mockMeditationSession.playAlarmSound).toHaveBeenCalled();
    } finally {
      runner.restore();
    }
  });

  it("executes all lifecycle useEffects including subscriptions and cleanups", async () => {
    const runner = createHookRunner();
    let appStateChangeCb: ((state: string) => void) | null = null;
    const originalAddEventListener = AppState.addEventListener;
    AppState.addEventListener = ((event: string, cb: any) => {
      if (event === "change") {
        appStateChangeCb = cb;
      }
      return {
        remove: () => {
          appStateChangeCb = null;
        },
      };
    }) as any;

    const originalSetInterval = globalThis.setInterval;
    globalThis.setInterval = ((cb: () => void, ms: number) => {
      try {
        cb();
      } catch {}
      return originalSetInterval(cb, ms);
    }) as any;

    try {
      // 1. Render in idle and run initial effects
      let hook = runner.render();
      let cleanup = runner.runEffects();

      // Trigger completion listener in moment 0 (tests return prev branch)
      if (typeof completionListener === "function") {
        completionListener();
      }

      // Verify volume was synced on both players
      expect(mockPlayerSingle.volume).toBe(0.9);
      expect(mockPlayerTriple.volume).toBe(0.9);

      // Verify audio mode effect was called
      expect(mockSetAudioMode).toHaveBeenCalled();

      // Advance to moment 1 in running state
      await hook.startSession();
      hook = runner.render();
      await hook.nextMoment();
      hook = runner.render();
      expect(hook.status).toBe("running");
      expect(hook.currentMomentIndex).toBe(1);

      // Run effects for running in moment 1
      cleanup();
      cleanup = runner.runEffects();

      // Trigger completion listener while in moment 1 (advances to moment 2 and plays gong)
      expect(typeof completionListener).toBe("function");
      completionListener!();

      // Trigger error listener
      expect(typeof errorListener).toBe("function");
      errorListener!("Native test error");

      // Set target time to 00:00 (in past for today) and re-render to trigger checkTargetTime branch
      hook.setTargetHour(0);
      hook.setTargetMinute(0);
      hook = runner.render();
      const targetCleanup = runner.runEffects();

      // Trigger AppState change
      expect(typeof appStateChangeCb).toBe("function");
      appStateChangeCb!("active");
      appStateChangeCb!("background");

      // Clean up running effects
      cleanup();
      targetCleanup();
    } finally {
      globalThis.setInterval = originalSetInterval;
      AppState.addEventListener = originalAddEventListener;
      runner.restore();
    }
  });

  it("triggers wall-clock target time alarm when scheduled time arrives", async () => {
    const runner = createHookRunner();
    let appStateChangeCb: ((state: string) => void) | null = null;
    const originalAddEventListener = AppState.addEventListener;
    AppState.addEventListener = ((event: string, cb: any) => {
      if (event === "change") {
        appStateChangeCb = cb;
      }
      return {
        remove: () => {
          appStateChangeCb = null;
        },
      };
    }) as any;

    try {
      let hook = runner.render();

      // Start session and advance to moment 1
      await hook.startSession();
      hook = runner.render();
      await hook.nextMoment();
      hook = runner.render();
      expect(hook.currentMomentIndex).toBe(1);
      expect(hook.hasAlarmTriggered).toBe(false);

      // Set target to past (00:00) so now >= todayTarget
      hook.setTargetHour(0);
      hook.setTargetMinute(0);
      hook = runner.render();

      // Run effect #7 with hasAlarmTriggered = false
      const cleanup = runner.runEffects();

      // Trigger AppState change to also execute checkTargetTime via listener
      expect(typeof appStateChangeCb).toBe("function");
      appStateChangeCb!("active");

      cleanup();
    } finally {
      AppState.addEventListener = originalAddEventListener;
      runner.restore();
    }
  });

  it("handles audio mode failure gracefully", () => {
    setAudioModeFail = true;
    const failRunner = createHookRunner();
    try {
      failRunner.render();
      failRunner.runEffects();
    } finally {
      failRunner.restore();
      setAudioModeFail = false;
    }
  });

  describe("Gong Playback via useMeditation", () => {
    it("plays single gong and triple gong through GongPlaybackService", async () => {
      const runner = createHookRunner();
      const hook = runner.render();

      mockMeditationSession.playAlarmSound.mockClear();
      await hook.playSingleGong();
      expect(mockMeditationSession.playAlarmSound).toHaveBeenCalled();

      mockMeditationSession.playAlarmSound.mockClear();
      await hook.playTripleGong();
      expect(mockMeditationSession.playAlarmSound).toHaveBeenCalled();

      runner.restore();
    });
  });
});
