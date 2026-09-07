import { MEDITATION_SOUNDS } from "@/constants/sounds";
import { MeditationSessionService } from "@/services/meditation-session";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import { useCallback, useEffect, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";

export interface MeditationState {
  status: "idle" | "running" | "paused" | "completed";
  currentMomentIndex: number;
  moments: string[];
  elapsedSeconds: number;
  targetHour: number;
  targetMinute: number;
  alarmEnabled: boolean;
  hasAlarmTriggered: boolean;
}

const DEFAULT_MOMENTS = [
  "Momento 1: Lectura y Reflexión",
  "Momento 2: Meditación hacia Hora Programada",
  "Momento 3: Cierre e Integración",
];

/**
 * Calculates the next upcoming Date instance for a configured wall-clock time (hour & minute).
 *
 * If the target time for the current calendar day has already passed or crosses midnight
 * (e.g. starting a session at 23:55 targeting 00:15, or starting at 10:00 targeting 08:00),
 * it rolls over the target date to tomorrow to prevent negative durations or immediate firing.
 */
export function getTargetDate(now: Date, hour: number, minute: number): Date {
  const target = new Date(now);
  target.setHours(hour, minute, 0, 0);

  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  return target;
}

export function useMeditation() {
  const singleGongPlayer = useAudioPlayer(MEDITATION_SOUNDS.SINGLE_GONG);
  const tripleGongPlayer = useAudioPlayer(MEDITATION_SOUNDS.TRIPLE_GONG);

  const [status, setStatus] = useState<
    "idle" | "running" | "paused" | "completed"
  >("idle");
  const [moments, setMoments] = useState<string[]>(DEFAULT_MOMENTS);
  const [currentMomentIndex, setCurrentMomentIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Target wall-clock alarm (e.g. 08:58)
  const [targetHour, setTargetHour] = useState(8);
  const [targetMinute, setTargetMinute] = useState(58);
  const [alarmEnabled, setAlarmEnabled] = useState(true);
  const [hasAlarmTriggered, setHasAlarmTriggered] = useState(false);

  // Configure global audio session
  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "mixWithOthers",
    }).catch((err) => {
      console.warn("Failed to set audio mode:", err);
    });
  }, []);

  const playSingleGong = useCallback(async () => {
    try {
      if (singleGongPlayer) {
        try {
          await singleGongPlayer.seekTo(0);
        } catch {}
        singleGongPlayer.play();
      }
    } catch (err) {
      console.warn("Failed to play single gong:", err);
    }
  }, [singleGongPlayer]);

  const playTripleGong = useCallback(async () => {
    try {
      if (tripleGongPlayer) {
        try {
          await tripleGongPlayer.seekTo(0);
        } catch {}
        tripleGongPlayer.play();
      }
    } catch (err) {
      console.warn("Failed to play triple gong:", err);
    }
  }, [tripleGongPlayer]);

  // Subscribe to platform-agnostic session completion events
  useEffect(() => {
    const handleCompletion = () => {
      setHasAlarmTriggered(true);
      setCurrentMomentIndex((prev) => {
        if (prev === 1) {
          void playSingleGong().catch(() => {});
          return 2;
        }
        return prev;
      });
    };

    return MeditationSessionService.subscribeCompletion(handleCompletion);
  }, [playSingleGong]);

  // Subscribe to platform-agnostic session error events
  useEffect(() => {
    const handleError = (error: string) => {
      console.error("[MeditationSession]", error);
    };

    return MeditationSessionService.subscribeError(handleError);
  }, []);

  // Elapsed timer interval
  useEffect(() => {
    if (status !== "running") return;

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [status]);

  // Real-time clock check for scheduled wall-clock target (transition 2 -> 3)
  useEffect(() => {
    if (
      status !== "running" ||
      currentMomentIndex !== 1 ||
      !alarmEnabled ||
      hasAlarmTriggered
    ) {
      return;
    }

    const checkTargetTime = () => {
      const now = new Date();
      const todayTarget = new Date(now);
      todayTarget.setHours(targetHour, targetMinute, 0, 0);

      if (now.getTime() >= todayTarget.getTime()) {
        setHasAlarmTriggered(true);
        void MeditationSessionService.stopSession().catch(() => {});
        void playSingleGong().catch(() => {});
        setCurrentMomentIndex((prev) => (prev === 1 ? 2 : prev));
      }
    };

    checkTargetTime();
    const interval = setInterval(checkTargetTime, 1000);

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === "active") {
        checkTargetTime();
      }
    };

    const sub = AppState.addEventListener("change", handleAppStateChange);

    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [
    status,
    currentMomentIndex,
    alarmEnabled,
    hasAlarmTriggered,
    targetHour,
    targetMinute,
    playSingleGong,
  ]);

  const startSession = useCallback(async () => {
    setElapsedSeconds(0);
    setCurrentMomentIndex(0);
    setHasAlarmTriggered(false);
    setStatus("running");
    await MeditationSessionService.stopSession();
    await playSingleGong();
  }, [playSingleGong]);

  const pauseSession = useCallback(() => {
    if (status === "running") {
      setStatus("paused");
      void MeditationSessionService.stopSession().catch(() => {});
    }
  }, [status]);

  const resumeSession = useCallback(() => {
    if (status === "paused") {
      setStatus("running");
      if (currentMomentIndex === 1 && alarmEnabled && !hasAlarmTriggered) {
        const now = new Date();
        const targetDate = getTargetDate(now, targetHour, targetMinute);
        void MeditationSessionService.startSession({ targetDate }).catch(
          () => {},
        );
      }
    }
  }, [
    status,
    currentMomentIndex,
    alarmEnabled,
    hasAlarmTriggered,
    targetHour,
    targetMinute,
  ]);

  const nextMoment = useCallback(async () => {
    if (status !== "running" && status !== "paused") return;

    const nextIndex = currentMomentIndex + 1;
    const isLast = nextIndex >= moments.length;

    if (isLast) {
      setStatus("completed");
      await MeditationSessionService.stopSession();
      await playTripleGong();
    } else {
      setCurrentMomentIndex(nextIndex);
      setStatus("running");
      await playSingleGong();

      // Al ingresar al Momento 2, iniciar la sesión en segundo plano en la plataforma correspondiente
      if (nextIndex === 1 && alarmEnabled && !hasAlarmTriggered) {
        const now = new Date();
        const targetDate = getTargetDate(now, targetHour, targetMinute);
        await MeditationSessionService.startSession({ targetDate });
      } else {
        await MeditationSessionService.stopSession();
      }
    }
  }, [
    status,
    currentMomentIndex,
    moments.length,
    alarmEnabled,
    hasAlarmTriggered,
    targetHour,
    targetMinute,
    playSingleGong,
    playTripleGong,
  ]);

  const resetSession = useCallback(async () => {
    setStatus("idle");
    setElapsedSeconds(0);
    setCurrentMomentIndex(0);
    setHasAlarmTriggered(false);
    await MeditationSessionService.stopSession();
  }, []);

  return {
    status,
    moments,
    currentMomentIndex,
    currentMoment: moments[currentMomentIndex] || "",
    isLastMoment: currentMomentIndex >= moments.length - 1,
    isWaitingForScheduledTime: currentMomentIndex === 1,
    elapsedSeconds,
    targetHour,
    targetMinute,
    alarmEnabled,
    hasAlarmTriggered,
    setTargetHour,
    setTargetMinute,
    setAlarmEnabled,
    setMoments,
    startSession,
    pauseSession,
    resumeSession,
    nextMoment,
    resetSession,
    playSingleGong,
    playTripleGong,
  };
}
