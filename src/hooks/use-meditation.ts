import { MEDITATION_SOUNDS } from "@/constants/sounds";
import { MeditationNotificationService } from "@/services/meditation-notification.service";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import { useCallback, useEffect, useRef, useState } from "react";
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
  const singleGongPlayer = useAudioPlayer(MEDITATION_SOUNDS.SINGLE_GONG);
  const tripleGongPlayer = useAudioPlayer(MEDITATION_SOUNDS.TRIPLE_GONG);
  const silencePlayer = useAudioPlayer(MEDITATION_SOUNDS.SILENCE);

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

  const scheduledNotificationIdRef = useRef<string | null>(null);

  // Configure audio session to play in silent mode, loop silence and setup Android notification channel
  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "mixWithOthers",
    }).catch((err) => {
      console.warn("Failed to set audio mode:", err);
    });

    if (silencePlayer) {
      // eslint-disable-next-line react-hooks/immutability
      silencePlayer.loop = true;
    }

    MeditationNotificationService.setupNotificationChannel();
  }, [silencePlayer]);

  const startSilenceLoop = useCallback(() => {
    try {
      if (silencePlayer) {
        silencePlayer.play();
      }
    } catch (err) {
      console.warn("Failed to start silence keep-alive loop:", err);
    }
  }, [silencePlayer]);

  const stopSilenceLoop = useCallback(() => {
    try {
      if (silencePlayer) {
        silencePlayer.pause();
        silencePlayer.seekTo(0).catch(() => {});
      }
    } catch (err) {
      console.warn("Failed to stop silence loop:", err);
    }
  }, [silencePlayer]);

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

  const cancelScheduledNotification = useCallback(async () => {
    if (scheduledNotificationIdRef.current) {
      await MeditationNotificationService.cancelNotification(
        scheduledNotificationIdRef.current,
      );
      scheduledNotificationIdRef.current = null;
    }
  }, []);

  const scheduleTargetNotification = useCallback(
    async (hour: number, minute: number) => {
      await cancelScheduledNotification();
      if (!alarmEnabled) return;

      const now = new Date();
      const targetDate = getTargetDate(now, hour, minute);

      const id =
        await MeditationNotificationService.scheduleNotification(targetDate);
      if (id) {
        scheduledNotificationIdRef.current = id;
      }
    },
    [alarmEnabled, cancelScheduledNotification],
  );

  // Listen for OS notification interactions to advance state
  useEffect(() => {
    const handleNotificationEvent = () => {
      setHasAlarmTriggered(true);
      setCurrentMomentIndex((prev) => {
        if (prev === 1) {
          stopSilenceLoop();
          playSingleGong();
          return 2;
        }
        return prev;
      });
    };

    return MeditationNotificationService.subscribeNotificationEvents(
      handleNotificationEvent,
    );
  }, [playSingleGong, stopSilenceLoop]);

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
        cancelScheduledNotification();
        stopSilenceLoop();
        playSingleGong();
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
    cancelScheduledNotification,
    playSingleGong,
    stopSilenceLoop,
  ]);

  const startSession = useCallback(async () => {
    setElapsedSeconds(0);
    setCurrentMomentIndex(0);
    setHasAlarmTriggered(false);
    setStatus("running");
    stopSilenceLoop();
    await cancelScheduledNotification();
    await playSingleGong();
  }, [playSingleGong, cancelScheduledNotification, stopSilenceLoop]);

  const pauseSession = useCallback(() => {
    if (status === "running") {
      setStatus("paused");
      stopSilenceLoop();
      cancelScheduledNotification();
    }
  }, [status, cancelScheduledNotification, stopSilenceLoop]);

  const resumeSession = useCallback(() => {
    if (status === "paused") {
      setStatus("running");
      if (currentMomentIndex === 1 && alarmEnabled && !hasAlarmTriggered) {
        startSilenceLoop();
        scheduleTargetNotification(targetHour, targetMinute);
      }
    }
  }, [
    status,
    currentMomentIndex,
    alarmEnabled,
    hasAlarmTriggered,
    targetHour,
    targetMinute,
    scheduleTargetNotification,
    startSilenceLoop,
  ]);

  const nextMoment = useCallback(async () => {
    if (status !== "running" && status !== "paused") return;

    const nextIndex = currentMomentIndex + 1;
    const isLast = nextIndex >= moments.length;

    if (isLast) {
      setStatus("completed");
      stopSilenceLoop();
      await cancelScheduledNotification();
      await playTripleGong();
    } else {
      setCurrentMomentIndex(nextIndex);
      setStatus("running");
      await playSingleGong();

      // Al ingresar al Momento 2, iniciar loop de silencio y agendar notificación de aviso
      if (nextIndex === 1 && alarmEnabled && !hasAlarmTriggered) {
        startSilenceLoop();
        await scheduleTargetNotification(targetHour, targetMinute);
      } else {
        stopSilenceLoop();
        await cancelScheduledNotification();
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
    scheduleTargetNotification,
    cancelScheduledNotification,
    playSingleGong,
    playTripleGong,
    startSilenceLoop,
    stopSilenceLoop,
  ]);

  const resetSession = useCallback(async () => {
    setStatus("idle");
    setElapsedSeconds(0);
    setCurrentMomentIndex(0);
    setHasAlarmTriggered(false);
    stopSilenceLoop();
    await cancelScheduledNotification();
  }, [cancelScheduledNotification, stopSilenceLoop]);

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
