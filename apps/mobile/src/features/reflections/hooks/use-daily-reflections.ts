import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useSQLiteContext } from "expo-sqlite";
import { useAuth } from "@/context/auth-context";
import {
  DateTime,
  type EntityId,
  type ReflectionQuestion,
  type UserQuestionPreference,
  type UserReflection,
} from "@myself/shared";
import { SqliteReflectionRepository } from "../infrastructure/sqlite-reflection.repository";
import { ExpoNotificationAdapter } from "../infrastructure/expo-notification.adapter";

/**
 * Loads the current user's daily questions, paused routines, preferences, and
 * reflections from SQLite. Exposes loading state and actions to refresh,
 * answer, skip, and update routine or shortcut preferences.
 */
export function useDailyReflections() {
  const db = useSQLiteContext();
  const { currentUser } = useAuth();
  const activeUserIdRef = useRef<string | null>(null);

  const repository = useMemo(() => new SqliteReflectionRepository(db), [db]);
  const notificationService = useMemo(() => new ExpoNotificationAdapter(), []);

  const [routineQuestions, setRoutineQuestions] = useState<
    ReflectionQuestion[]
  >([]);
  const [optedOutRoutineQuestions, setOptedOutRoutineQuestions] = useState<
    ReflectionQuestion[]
  >([]);
  const [adHocQuestions, setAdHocQuestions] = useState<ReflectionQuestion[]>(
    [],
  );
  const [preferences, setPreferences] = useState<UserQuestionPreference[]>([]);
  const [missedQuestions, setMissedQuestions] = useState<
    {
      question: ReflectionQuestion;
      missedDate: string;
      reflection?: UserReflection | null;
    }[]
  >([]);
  const [todayReflections, setTodayReflections] = useState<
    Record<string, UserReflection>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    const currentUserId = currentUser?.id ?? null;
    activeUserIdRef.current = currentUserId;

    if (!currentUser) {
      setRoutineQuestions([]);
      setOptedOutRoutineQuestions([]);
      setAdHocQuestions([]);
      setPreferences([]);
      setMissedQuestions([]);
      setTodayReflections({});
      setIsLoading(false);
      return;
    }

    const currentTodayStr = DateTime.today().toISODate();

    try {
      setIsLoading(true);
      const [routine, optedOut, adHoc, prefs, missed] = await Promise.all([
        repository.getDailyRoutineQuestions(currentUser.id as EntityId),
        repository.getOptedOutRoutineQuestions(currentUser.id as EntityId),
        repository.getAdHocQuestions(),
        repository.getUserPreferences(currentUser.id as EntityId),
        repository.getMissedDailyQuestions(
          currentUser.id as EntityId,
          currentTodayStr,
        ),
      ]);

      if (activeUserIdRef.current !== currentUserId) return;

      setRoutineQuestions(routine);
      setOptedOutRoutineQuestions(optedOut);
      setAdHocQuestions(adHoc);
      setPreferences(prefs);
      setMissedQuestions(missed);

      // Check reflections for today for all routine and ad-hoc questions
      const allQuestionIds = [...routine, ...adHoc].map((q) => q.id);
      const reflectionEntries = await Promise.all(
        allQuestionIds.map(async (qId) => {
          const ref = await repository.getReflectionForQuestionAndDate(
            currentUser.id as EntityId,
            qId,
            currentTodayStr,
          );
          return [qId, ref] as const;
        }),
      );

      if (activeUserIdRef.current !== currentUserId) return;

      const reflectionsMap: Record<string, UserReflection> = {};
      for (const [qId, ref] of reflectionEntries) {
        if (ref) {
          reflectionsMap[qId] = ref;
        }
      }
      setTodayReflections(reflectionsMap);
    } catch (error) {
      if (activeUserIdRef.current === currentUserId) {
        console.error("Failed to load daily reflections:", error);
      }
    } finally {
      if (activeUserIdRef.current === currentUserId) {
        setIsLoading(false);
      }
    }
  }, [currentUser, repository]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const submitReflection = useCallback(
    async (
      question: ReflectionQuestion,
      input: {
        content?: string;
        numericValue?: number;
        items?: ({ id?: EntityId; content: string } | string)[];
        forDate?: DateTime | string;
      },
    ) => {
      if (!currentUser) {
        throw new Error("No active user session");
      }

      try {
        setIsSubmitting(true);
        const effectiveDate = input.forDate
          ? typeof input.forDate === "string"
            ? input.forDate
            : input.forDate.toISODate()
          : DateTime.today().toISODate();
        const reflection = await repository.saveReflection({
          userId: currentUser.id as EntityId,
          questionId: question.id,
          themeId: question.themeId ?? null,
          cycleRunId: null,
          status: "answered",
          responseType: question.responseType,
          content: input.content,
          numericValue: input.numericValue,
          items: input.items?.map((item, idx) => ({
            id: typeof item === "string" ? undefined : item.id,
            content: typeof item === "string" ? item : item.content,
            orderIndex: idx,
          })),
          forDate: effectiveDate,
        });

        await refresh();
        return reflection;
      } finally {
        setIsSubmitting(false);
      }
    },
    [currentUser, repository, refresh],
  );

  const skipQuestion = useCallback(
    async (
      question: ReflectionQuestion,
      skipReason: string,
      forDate?: DateTime | string,
    ) => {
      if (!currentUser) {
        throw new Error("No active user session");
      }

      try {
        setIsSubmitting(true);
        const effectiveDate = forDate
          ? typeof forDate === "string"
            ? forDate
            : forDate.toISODate()
          : DateTime.today().toISODate();
        const reflection = await repository.saveReflection({
          userId: currentUser.id as EntityId,
          questionId: question.id,
          themeId: question.themeId ?? null,
          cycleRunId: null,
          status: "skipped",
          responseType: question.responseType,
          skipReason,
          forDate: effectiveDate,
        });

        await refresh();
        return reflection;
      } finally {
        setIsSubmitting(false);
      }
    },
    [currentUser, repository, refresh],
  );

  const toggleRoutineOptOut = useCallback(
    async (questionId: EntityId, isEnabled: boolean) => {
      if (!currentUser) return;
      await repository.setRoutineOptOut(
        currentUser.id as EntityId,
        questionId,
        isEnabled,
      );

      if (!isEnabled) {
        await notificationService.cancelReminderForQuestion(questionId);
      } else {
        const question =
          routineQuestions.find((q) => q.id === questionId) ??
          optedOutRoutineQuestions.find((q) => q.id === questionId);
        if (question?.preferredTimeOfDay) {
          await notificationService.scheduleDailyReminder(
            questionId,
            question.preferredTimeOfDay,
            question.prompt,
          );
        }
      }

      await refresh();
    },
    [
      currentUser,
      repository,
      notificationService,
      routineQuestions,
      optedOutRoutineQuestions,
      refresh,
    ],
  );

  const toggleAdHocShortcut = useCallback(
    async (questionId: EntityId, isPinned: boolean) => {
      if (!currentUser) return;
      await repository.setAdHocShortcut(
        currentUser.id as EntityId,
        questionId,
        isPinned,
      );
      await refresh();
    },
    [currentUser, repository, refresh],
  );

  const pinnedQuestions = useMemo(() => {
    const pinnedSet = new Set(
      preferences.filter((p) => p.isPinnedShortcut).map((p) => p.questionId),
    );
    return adHocQuestions.filter((q) => pinnedSet.has(q.id));
  }, [preferences, adHocQuestions]);

  return {
    currentUser,
    routineQuestions,
    optedOutRoutineQuestions,
    adHocQuestions,
    pinnedQuestions,
    missedQuestions,
    todayReflections,
    preferences,
    isLoading,
    isSubmitting,
    refresh,
    submitReflection,
    skipQuestion,
    toggleRoutineOptOut,
    toggleAdHocShortcut,
  };
}
