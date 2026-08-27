import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import * as Notifications from "expo-notifications";
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

// Configure global notification presentation
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

function getTargetDate(baseDate: Date, hour: number, minute: number): Date {
  const target = new Date(baseDate);
  target.setHours(hour, minute, 0, 0);
  // If target time is earlier than baseDate, it is meant for tomorrow
  if (target.getTime() < baseDate.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  return target;
}

export function useMeditation() {
  const singleGongPlayer = useAudioPlayer(
    require("@/assets/sounds/bowl_1.m4a"),
  );
  const tripleGongPlayer = useAudioPlayer(
    require("@/assets/sounds/bowl_3.m4a"),
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

  const sessionStartTimeRef = useRef<Date | null>(null);
  const scheduledNotificationIdRef = useRef<string | null>(null);

  // Configure audio session to play in silent mode and background
  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "mixWithOthers",
    }).catch((err) => {
      console.warn("Failed to set audio mode:", err);
    });

    if (Platform.OS === "android") {
      Notifications.setNotificationChannelAsync("meditation_alarm_channel_v2", {
        name: "Meditation Alarms",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 200, 500],
        sound: "bowl_1.m4a",
        enableLights: true,
        enableVibrate: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,
        audioAttributes: {
          usage: Notifications.AndroidAudioUsage.ALARM,
          contentType: Notifications.AndroidAudioContentType.SONIFICATION,
          flags: {
            enforceAudibility: true,
            requestHardwareAudioVideoSynchronization: false,
          },
        },
      }).catch((err) => {
        console.warn("Failed to create Android notification channel:", err);
      });
    }
  }, []);

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

  const cancelScheduledAlarm = useCallback(async () => {
    if (scheduledNotificationIdRef.current) {
      try {
        await Notifications.cancelScheduledNotificationAsync(
          scheduledNotificationIdRef.current,
        );
      } catch {}
      scheduledNotificationIdRef.current = null;
    }
  }, []);

  const scheduleTargetAlarm = useCallback(async () => {
    await cancelScheduledAlarm();
    if (!alarmEnabled || status !== "running" || currentMomentIndex !== 1) {
      return;
    }

    try {
      const { status: permStatus } = await Notifications.getPermissionsAsync();
      if (permStatus !== "granted") {
        await Notifications.requestPermissionsAsync();
      }

      const now = new Date();
      const baseDate = sessionStartTimeRef.current || now;
      const targetDate = getTargetDate(baseDate, targetHour, targetMinute);

      if (targetDate.getTime() > now.getTime()) {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: "Momento 3: Cierre e Integración",
            body: "Se cumplió la hora programada de la meditación.",
            sound: "bowl_1.m4a",
            categoryIdentifier: "alarm",
            priority: Notifications.AndroidNotificationPriority.MAX,
            data: { type: "meditation_alarm" },
            ...(Platform.OS === "android"
              ? { channelId: "meditation_alarm_channel_v2" }
              : {}),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: targetDate,
          },
        });
        scheduledNotificationIdRef.current = id;
      }
    } catch (err) {
      console.warn("Failed to schedule target notification:", err);
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

  // Listen for OS notification arrivals to advance state
  useEffect(() => {
    const subReceived = Notifications.addNotificationReceivedListener(
      (notification) => {
        if (notification.request.content.data?.type === "meditation_alarm") {
          setHasAlarmTriggered(true);
          setCurrentMomentIndex((prev) => (prev === 1 ? 2 : prev));
        }
      },
    );

    const subResponse = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        if (
          response.notification.request.content.data?.type === "meditation_alarm"
        ) {
          setHasAlarmTriggered(true);
          setCurrentMomentIndex((prev) => (prev === 1 ? 2 : prev));
        }
      },
    );

    return () => {
      subReceived.remove();
      subResponse.remove();
    };
  }, []);

  // Elapsed timer interval
  useEffect(() => {
    if (status !== "running") return;

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [status]);

  // Real-time clock check for scheduled wall-clock alarm (automatic transition 2 -> 3 in foreground)
  useEffect(() => {
    if (status !== "running" || !alarmEnabled || hasAlarmTriggered) return;

    const checkAlarm = () => {
      const now = new Date();
      const baseDate = sessionStartTimeRef.current || now;
      const targetDate = getTargetDate(baseDate, targetHour, targetMinute);

      if (now.getTime() >= targetDate.getTime()) {
        setHasAlarmTriggered(true);
        cancelScheduledAlarm();

        // Solo sonar el gong en JS si se dispara en tiempo real (evitando sonar duplicado si el usuario abre la app tarde desde el bloqueo)
        const timeDiff = now.getTime() - targetDate.getTime();
        if (timeDiff < 3000) {
          playSingleGong();
        }

        // Si estamos en el Momento 2 (índice 1), avanzar automáticamente al Momento 3 (índice 2)
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
