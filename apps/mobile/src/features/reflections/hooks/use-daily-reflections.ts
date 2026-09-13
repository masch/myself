import { useState, useCallback, useEffect, useMemo } from "react";
import { useSQLiteContext } from "expo-sqlite";
import { useAuth } from "@/context/auth-context";
import {
  type EntityId,
  type ReflectionQuestion,
  type UserQuestionPreference,
  type UserReflection,
} from "@myself/shared";
import { SqliteReflectionRepository } from "../infrastructure/sqlite-reflection.repository";
import { ExpoNotificationAdapter } from "../infrastructure/expo-notification.adapter";

export function useDailyReflections() {
  const db = useSQLiteContext();
  const { currentUser } = useAuth();

  const repository = useMemo(() => new SqliteReflectionRepository(db), [db]);
  const notificationService = useMemo(() => new ExpoNotificationAdapter(), []);

  const [routineQuestions, setRoutineQuestions] = useState<
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

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  const refresh = useCallback(async () => {
    if (!currentUser) {
      setRoutineQuestions([]);
      setAdHocQuestions([]);
      setPreferences([]);
      setMissedQuestions([]);
      setTodayReflections({});
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const [routine, adHoc, prefs, missed] = await Promise.all([
        repository.getDailyRoutineQuestions(currentUser.id as EntityId),
        repository.getAdHocQuestions(),
        repository.getUserPreferences(currentUser.id as EntityId),
        repository.getMissedDailyQuestions(
          currentUser.id as EntityId,
          todayStr,
        ),
      ]);

      setRoutineQuestions(routine);
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
            todayStr,
          );
          return [qId, ref] as const;
        }),
      );

      const reflectionsMap: Record<string, UserReflection> = {};
      for (const [qId, ref] of reflectionEntries) {
        if (ref) {
          reflectionsMap[qId] = ref;
        }
      }
      setTodayReflections(reflectionsMap);
    } catch (error) {
      console.error("Failed to load daily reflections:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, repository, todayStr]);

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
        forDate?: string;
      },
    ) => {
      if (!currentUser) {
        throw new Error("No active user session");
      }

      try {
        setIsSubmitting(true);
        const reflection = await repository.saveReflection({
          userId: currentUser.id as EntityId,
          questionId: question.id,
          themeId: question.themeId ?? null,
          cycleRunId: null,
          status: "answered",
          responseType: question.responseType,
          content: input.content,
          numericValue: input.numericValue,
          forDate: input.forDate ?? todayStr,
        });

        await refresh();
        return reflection;
      } finally {
        setIsSubmitting(false);
      }
    },
    [currentUser, repository, todayStr, refresh],
  );

  const skipQuestion = useCallback(
    async (
      question: ReflectionQuestion,
      skipReason: string,
      forDate?: string,
    ) => {
      if (!currentUser) {
        throw new Error("No active user session");
      }

      try {
        setIsSubmitting(true);
        const reflection = await repository.saveReflection({
          userId: currentUser.id as EntityId,
          questionId: question.id,
          themeId: question.themeId ?? null,
          cycleRunId: null,
          status: "skipped",
          responseType: question.responseType,
          skipReason,
          forDate: forDate ?? todayStr,
        });

        await refresh();
        return reflection;
      } finally {
        setIsSubmitting(false);
      }
    },
    [currentUser, repository, todayStr, refresh],
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
        const question = routineQuestions.find((q) => q.id === questionId);
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
    [currentUser, repository, notificationService, routineQuestions, refresh],
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
