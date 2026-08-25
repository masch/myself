import { useState, useEffect, useRef, useCallback } from "react";
import { useAudioPlayer } from "expo-audio";

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
  "Momento 1: Inicio y Silencio",
  "Momento 2: Meditación hacia Hora Programada",
  "Momento 3: Cierre e Integración",
];

export function useMeditation() {
  const singleGongPlayer = useAudioPlayer(
    require("@/assets/sounds/gong-single.mp3"),
  );
  const tripleGongPlayer = useAudioPlayer(
    require("@/assets/sounds/gong-triple.mp3"),
  );

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

  const lastTriggeredKeyRef = useRef<string | null>(null);

  const playSingleGong = useCallback(async () => {
    try {
      if (singleGongPlayer) {
        await singleGongPlayer.seekTo(0);
        singleGongPlayer.play();
      }
    } catch (err) {
      console.warn("Failed to play single gong:", err);
    }
  }, [singleGongPlayer]);

  const playTripleGong = useCallback(async () => {
    try {
      if (tripleGongPlayer) {
        await tripleGongPlayer.seekTo(0);
        tripleGongPlayer.play();
      }
    } catch (err) {
      console.warn("Failed to play triple gong:", err);
    }
  }, [tripleGongPlayer]);

  // Elapsed timer interval
  useEffect(() => {
    if (status !== "running") return;

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [status]);

  // Real-time clock check for scheduled wall-clock alarm (automatic transition 2 -> 3)
  useEffect(() => {
    if (status !== "running" || !alarmEnabled) return;

    const checkAlarm = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMin = now.getMinutes();

      const minuteKey = `${now.toDateString()} ${currentHour}:${currentMin}`;

      if (
        currentHour === targetHour &&
        currentMin === targetMinute &&
        lastTriggeredKeyRef.current !== minuteKey
      ) {
        lastTriggeredKeyRef.current = minuteKey;
        setHasAlarmTriggered(true);

        // Disparar gong simple
        playSingleGong();

        // Si estamos en el Momento 2 (índice 1), avanzar automáticamente al Momento 3 (índice 2)
        setCurrentMomentIndex((prev) => (prev === 1 ? 2 : prev));
      }
    };

    checkAlarm();
    const interval = setInterval(checkAlarm, 1000);
    return () => clearInterval(interval);
  }, [status, alarmEnabled, targetHour, targetMinute, playSingleGong]);

  const startSession = useCallback(async () => {
    setElapsedSeconds(0);
    setCurrentMomentIndex(0);
    setHasAlarmTriggered(false);
    lastTriggeredKeyRef.current = null;
    setStatus("running");
    await playSingleGong();
  }, [playSingleGong]);

  const pauseSession = useCallback(() => {
    if (status === "running") {
      setStatus("paused");
    }
  }, [status]);

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
      await playTripleGong();
    } else {
      setCurrentMomentIndex((prev) => prev + 1);
      setStatus("running");
      await playSingleGong();
    }
  }, [
    status,
    currentMomentIndex,
    moments.length,
    playSingleGong,
    playTripleGong,
  ]);

  const resetSession = useCallback(() => {
    setStatus("idle");
    setElapsedSeconds(0);
    setCurrentMomentIndex(0);
    setHasAlarmTriggered(false);
    lastTriggeredKeyRef.current = null;
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
