import { useState, useCallback, useEffect, useMemo } from "react";
import { useSQLiteContext } from "expo-sqlite";
import { useAuth } from "@/context/auth-context";
import {
  type EntityId,
  type ReflectionQuestion,
  type ReflectionTheme,
  type ThemeCohort,
  type UserReflection,
} from "@myself/shared";
import { type ActiveCohortProgressDetail } from "../domain/ports/reflection.repository.port";
import { SqliteReflectionRepository } from "../infrastructure/sqlite-reflection.repository";
import { isCohortStarted } from "../domain/time-lock";

export function useThemeCohort() {
  const db = useSQLiteContext();
  const { currentUser } = useAuth();

  const repository = useMemo(() => new SqliteReflectionRepository(db), [db]);

  const [activeCohorts, setActiveCohorts] = useState<
    ActiveCohortProgressDetail[]
  >([]);
  const [openCohorts, setOpenCohorts] = useState<ThemeCohort[]>([]);
  const [themes, setThemes] = useState<ReflectionTheme[]>([]);
  const [cycleReflections, setCycleReflections] = useState<
    Record<string, UserReflection[]>
  >({});
  const [cohortQuestions, setCohortQuestions] = useState<
    Record<string, ReflectionQuestion[]>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    if (!currentUser) {
      setActiveCohorts([]);
      setOpenCohorts([]);
      setThemes([]);
      setCycleReflections({});
      setCohortQuestions({});
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const [active, open, allThemes] = await Promise.all([
        repository.getUserActiveCohortProgress(currentUser.id as EntityId),
        repository.getOpenCohorts(),
        repository.getThemes(),
      ]);

      setActiveCohorts(active);
      setOpenCohorts(open);
      setThemes(allThemes);

      // Load reflections and questions for active cohorts
      const reflectionsMap: Record<string, UserReflection[]> = {};
      const questionsMap: Record<string, ReflectionQuestion[]> = {};
      await Promise.all(
        active.map(async (progress) => {
          const [refs, questions] = await Promise.all([
            repository.getReflectionsForCycleRun(progress.id),
            repository.getQuestionsForTheme(progress.themeId),
          ]);
          reflectionsMap[progress.id] = refs;
          questionsMap[progress.id] = questions;
        }),
      );
      setCycleReflections(reflectionsMap);
      setCohortQuestions(questionsMap);
    } catch (error) {
      console.error("Failed to load theme cohorts:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, repository]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const enroll = useCallback(
    async (themeId: EntityId, cohortId: EntityId) => {
      if (!currentUser) {
        throw new Error("No active user session");
      }

      try {
        setIsSubmitting(true);
        const progress = await repository.enrollInCohort(
          currentUser.id as EntityId,
          themeId,
          cohortId,
        );
        await refresh();
        return progress;
      } finally {
        setIsSubmitting(false);
      }
    },
    [currentUser, repository, refresh],
  );

  const leaveCohort = useCallback(
    async (cohortId: EntityId) => {
      if (!currentUser) {
        throw new Error("No active user session");
      }

      try {
        setIsSubmitting(true);
        await repository.leaveCohort(currentUser.id as EntityId, cohortId);
        await refresh();
      } finally {
        setIsSubmitting(false);
      }
    },
    [currentUser, repository, refresh],
  );

  const submitCycleReflection = useCallback(
    async (
      progress: ActiveCohortProgressDetail,
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

      const effectiveDate =
        input.forDate ?? new Date().toISOString().split("T")[0];
      if (!isCohortStarted(progress.cohort.programStartDate, effectiveDate)) {
        throw new Error(
          `Cannot submit reflection before program starts on ${progress.cohort.programStartDate}`,
        );
      }

      try {
        setIsSubmitting(true);
        const reflection = await repository.saveReflection({
          userId: currentUser.id as EntityId,
          questionId: question.id,
          themeId: progress.themeId,
          cycleRunId: progress.id,
          status: "answered",
          responseType: question.responseType,
          content: input.content,
          numericValue: input.numericValue,
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

  const skipCycleQuestion = useCallback(
    async (
      progress: ActiveCohortProgressDetail,
      question: ReflectionQuestion,
      skipReason: string,
      forDate?: string,
    ) => {
      if (!currentUser) {
        throw new Error("No active user session");
      }

      const effectiveDate = forDate ?? new Date().toISOString().split("T")[0];
      if (!isCohortStarted(progress.cohort.programStartDate, effectiveDate)) {
        throw new Error(
          `Cannot skip question before program starts on ${progress.cohort.programStartDate}`,
        );
      }

      try {
        setIsSubmitting(true);
        const reflection = await repository.saveReflection({
          userId: currentUser.id as EntityId,
          questionId: question.id,
          themeId: progress.themeId,
          cycleRunId: progress.id,
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

  return {
    currentUser,
    activeCohorts,
    openCohorts,
    themes,
    cycleReflections,
    cohortQuestions,
    isLoading,
    isSubmitting,
    refresh,
    enroll,
    leaveCohort,
    submitCycleReflection,
    skipCycleQuestion,
  };
}
