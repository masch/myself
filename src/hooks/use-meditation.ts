import { MEDITATION_SOUNDS } from "@/constants/sounds";
import { MeditationAlarmService } from "@/services/meditation-alarm.service";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform, type AppStateStatus } from "react-native";

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

function getTargetDate(now: Date, hour: number, minute: number): Date {
  const target = new Date(now);
  target.setHours(hour, minute, 0, 0);
  // Si la hora objetivo es igual o anterior al instante actual, programar para mañana a esa hora
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  return target;
}

export function useMeditation() {
  const singleGongPlayer = useAudioPlayer(MEDITATION_SOUNDS.SINGLE_GONG.asset);
  const tripleGongPlayer = useAudioPlayer(MEDITATION_SOUNDS.TRIPLE_GONG.asset);

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

  const sessionStartTimeRef = useRef<Date | null>(null);
  const scheduledNotificationIdRef = useRef<string | null>(null);

  // Configure audio session to play in silent mode and setup Android alarm channel
  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "mixWithOthers",
    }).catch((err) => {
      console.warn("Failed to set audio mode:", err);
    });

    MeditationAlarmService.setupNotificationChannel();
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

  const cancelScheduledAlarm = useCallback(async () => {
    if (scheduledNotificationIdRef.current) {
      await MeditationAlarmService.cancelAlarm(
        scheduledNotificationIdRef.current,
      );
      scheduledNotificationIdRef.current = null;
    }
  }, []);

  const scheduleTargetAlarm = useCallback(async () => {
    await cancelScheduledAlarm();
    if (!alarmEnabled || status !== "running" || currentMomentIndex !== 1) {
      return;
    }

    const now = new Date();
    const targetDate = getTargetDate(now, targetHour, targetMinute);

    const id = await MeditationAlarmService.scheduleAlarm(targetDate);
    if (id) {
      scheduledNotificationIdRef.current = id;
    }
  }, [
    alarmEnabled,
    status,
    currentMomentIndex,
    targetHour,
    targetMinute,
    cancelScheduledAlarm,
  ]);

  // Synchronize OS-level scheduled alarm with active state in Moment 2
  useEffect(() => {
    if (
      status === "running" &&
      currentMomentIndex === 1 &&
      alarmEnabled &&
      !hasAlarmTriggered
    ) {
      scheduleTargetAlarm();
    } else {
      cancelScheduledAlarm();
    }
  }, [
    status,
    currentMomentIndex,
    alarmEnabled,
    hasAlarmTriggered,
    scheduleTargetAlarm,
    cancelScheduledAlarm,
  ]);

  // Listen for OS notification events or user interaction to advance state
  useEffect(() => {
    const handleAlarmEvent = () => {
      setHasAlarmTriggered(true);
      setCurrentMomentIndex((prev) => {
        if (prev === 1) {
          const isAppInForeground =
            Platform.OS === "web" || AppState.currentState === "active";
          if (isAppInForeground) {
            playSingleGong();
          }
          return 2;
        }
        return prev;
      });
    };

    return MeditationAlarmService.subscribeAlarmEvents(handleAlarmEvent);
  }, [playSingleGong]);

  // Elapsed timer interval
  useEffect(() => {
    if (status !== "running") return;

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [status]);

  // Real-time clock check for scheduled wall-clock alarm (deterministic transition 2 -> 3)
  useEffect(() => {
    if (
      status !== "running" ||
      currentMomentIndex !== 1 ||
      !alarmEnabled ||
      hasAlarmTriggered
    ) {
      return;
    }

    const checkAlarm = () => {
      const now = new Date();
      const todayTarget = new Date(now);
      todayTarget.setHours(targetHour, targetMinute, 0, 0);

      // Si el reloj alcanzó o superó el horario objetivo
      if (now.getTime() >= todayTarget.getTime()) {
        setHasAlarmTriggered(true);
        cancelScheduledAlarm();

        const isAppInForeground =
          Platform.OS === "web" || AppState.currentState === "active";
        if (isAppInForeground) {
          playSingleGong();
        }

        setCurrentMomentIndex((prev) => (prev === 1 ? 2 : prev));
      }
    };

    checkAlarm();
    const interval = setInterval(checkAlarm, 1000);

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === "active") {
        checkAlarm();
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
    cancelScheduledAlarm,
    playSingleGong,
  ]);

  const startSession = useCallback(async () => {
    setElapsedSeconds(0);
    setCurrentMomentIndex(0);
    setHasAlarmTriggered(false);
    sessionStartTimeRef.current = new Date();
    setStatus("running");
    await playSingleGong();
  }, [playSingleGong]);

  const pauseSession = useCallback(() => {
    if (status === "running") {
      setStatus("paused");
      cancelScheduledAlarm();
    }
  }, [status, cancelScheduledAlarm]);

  const resumeSession = useCallback(() => {
    if (status === "paused") {
      setStatus("running");
    }
  }, [status]);

  const nextMoment = useCallback(async () => {
    if (status !== "running" && status !== "paused") return;

    const isLast = currentMomentIndex >= moments.length - 1;

    if (isLast) {
      setStatus("completed");
      await cancelScheduledAlarm();
      await playTripleGong();
    } else {
      await cancelScheduledAlarm();
      setCurrentMomentIndex((prev) => prev + 1);
      setStatus("running");
      await playSingleGong();
    }
  }, [
    status,
    currentMomentIndex,
    moments.length,
    cancelScheduledAlarm,
    playSingleGong,
    playTripleGong,
  ]);

  const resetSession = useCallback(async () => {
    setStatus("idle");
    setElapsedSeconds(0);
    setCurrentMomentIndex(0);
    setHasAlarmTriggered(false);
    sessionStartTimeRef.current = null;
    await cancelScheduledAlarm();
  }, [cancelScheduledAlarm]);

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
