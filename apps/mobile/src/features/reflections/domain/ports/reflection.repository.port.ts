import type {
  CreateReflectionInput,
  EntityId,
  ReflectionCategory,
  ReflectionQuestion,
  ReflectionTheme,
  ThemeCohort,
  UserQuestionPreference,
  UserReflection,
  UserThemeProgress,
} from "@myself/shared";

export interface ActiveCohortProgressDetail extends UserThemeProgress {
  theme: ReflectionTheme;
  cohort: ThemeCohort;
  currentQuestion: ReflectionQuestion | null;
}

export interface ReflectionRepositoryPort {
  // 1. Catalog & Cohorts
  getCategories(): Promise<ReflectionCategory[]>;
  getThemes(): Promise<ReflectionTheme[]>;
  getOpenCohorts(): Promise<ThemeCohort[]>;
  getCohortById(cohortId: EntityId): Promise<ThemeCohort | null>;
  getQuestionsForTheme(themeId: EntityId): Promise<ReflectionQuestion[]>;
  getAdHocQuestions(): Promise<ReflectionQuestion[]>;
  getDailyRoutineQuestions(userId: EntityId): Promise<ReflectionQuestion[]>;

  // 2. User Preferences (Opt-out & Shortcuts)
  getUserPreferences(userId: EntityId): Promise<UserQuestionPreference[]>;
  setRoutineOptOut(
    userId: EntityId,
    questionId: EntityId,
    isEnabled: boolean,
  ): Promise<void>;
  setAdHocShortcut(
    userId: EntityId,
    questionId: EntityId,
    isPinned: boolean,
  ): Promise<void>;

  // 3. Cohort Enrollment & Progression
  enrollInCohort(
    userId: EntityId,
    themeId: EntityId,
    cohortId: EntityId,
  ): Promise<UserThemeProgress>;
  getUserActiveCohortProgress(
    userId: EntityId,
  ): Promise<ActiveCohortProgressDetail[]>;
  getCohortProgressById(
    progressId: EntityId,
  ): Promise<UserThemeProgress | null>;
  leaveCohort(userId: EntityId, cohortId: EntityId): Promise<void>;

  // 4. Submissions & Reflection History
  saveReflection(input: CreateReflectionInput): Promise<UserReflection>;
  getReflectionForQuestionAndDate(
    userId: EntityId,
    questionId: EntityId,
    forDate: string,
  ): Promise<UserReflection | null>;
  getReflectionsForCycleRun(cycleRunId: EntityId): Promise<UserReflection[]>;
  getUserReflectionHistory(
    userId: EntityId,
  ): Promise<(UserReflection & { question: ReflectionQuestion })[]>;
  getMissedDailyQuestions(
    userId: EntityId,
    todayDate: string,
  ): Promise<
    {
      question: ReflectionQuestion;
      missedDate: string;
      reflection?: UserReflection | null;
    }[]
  >;
}
