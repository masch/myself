import { useState, useCallback, useEffect, useMemo } from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import { Stack, useFocusEffect } from "expo-router";
import {
  DateTime,
  type EntityId,
  type ReflectionQuestion,
  type ThemeCohort,
  type UserReflection,
} from "@myself/shared";
import { colors, layout, spacing } from "@/theme";
import {
  ScreenContainer,
  Accordion,
  Collapsible,
  ThemedText,
  Card,
  ChipButton,
  EmptyState,
  NativeSwitch,
  SegmentedControl,
  Spinner,
  useToast,
} from "@/components";

import { useDailyReflections } from "@/features/reflections/hooks/use-daily-reflections";
import { useThemeCohort } from "@/features/reflections/hooks/use-theme-cohort";
import { type ActiveCohortProgressDetail } from "@/features/reflections/domain/ports/reflection.repository.port";
import {
  PromptCard,
  CohortEnrollmentCard,
  CycleProgressBadge,
  ReflectionModal,
  SkipReasonSheet,
} from "@/features/reflections/components";
import {
  isReflectionLocked,
  isCohortStarted,
  isCohortStepUnlocked,
  getCohortStepUnlockDate,
  formatDateDDMM,
  formatRelativeMissedDate,
} from "@/features/reflections/domain/time-lock";

type SectionTab = "daily" | "cohorts";

/**
 * Displays daily and cohort reflections, with answer and skip flows, routine
 * opt-out undo, and controls for reactivating paused questions.
 */
export default function ReflectionsScreen() {
  const [currentTab, setCurrentTab] = useState<SectionTab>("daily");

  const {
    routineQuestions,
    optedOutRoutineQuestions,
    adHocQuestions,
    pinnedQuestions,
    missedQuestions,
    todayReflections,
    preferences,
    isLoading: isDailyLoading,
    refresh: refreshDaily,
    submitReflection: submitDailyReflection,
    skipQuestion: skipDailyQuestion,
    toggleRoutineOptOut,
    toggleAdHocShortcut,
  } = useDailyReflections();

  const {
    activeCohorts,
    openCohorts,
    themes,
    cycleReflections,
    cohortQuestions,
    isLoading: isCohortLoading,
    refresh: refreshCohorts,
    enroll,
    leaveCohort,
    submitCycleReflection,
    skipCycleQuestion,
  } = useThemeCohort();

  const [currentDateTime, setCurrentDateTime] = useState(() => DateTime.now());
  const currentLocalDate = useMemo(
    () => DateTime.today(currentDateTime),
    [currentDateTime],
  );
  const [showAnswered, setShowAnswered] = useState(true);
  const [showPaused, setShowPaused] = useState(false);
  const toast = useToast();

  const handleToggleRoutineOptOut = useCallback(
    async (questionId: EntityId, isEnabled: boolean) => {
      try {
        await toggleRoutineOptOut(questionId, isEnabled);
        if (!isEnabled) {
          toast.undo("Pregunta dada de baja de tu rutina", () => {
            void toggleRoutineOptOut(questionId, true);
          });
        } else {
          toast.success("Pregunta reactivada en tu rutina");
        }
      } catch (err) {
        console.error("Failed to toggle routine opt-out:", err);
      }
    },
    [toggleRoutineOptOut, toast],
  );

  useFocusEffect(
    useCallback(() => {
      setCurrentDateTime(DateTime.now());
      void refreshDaily();
      void refreshCohorts();
    }, [refreshDaily, refreshCohorts]),
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(DateTime.now());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Modal states for answering
  const [answeringQuestion, setAnsweringQuestion] =
    useState<ReflectionQuestion | null>(null);
  const [answeringCycleProgress, setAnsweringCycleProgress] =
    useState<ActiveCohortProgressDetail | null>(null);
  const [answeringForDate, setAnsweringForDate] = useState<string | undefined>(
    undefined,
  );
  const [answeringInitialContent, setAnsweringInitialContent] = useState<
    string | undefined
  >(undefined);
  const [answeringInitialNumericValue, setAnsweringInitialNumericValue] =
    useState<number | undefined>(undefined);
  const [answeringInitialItems, setAnsweringInitialItems] = useState<
    { id?: EntityId; content: string }[] | undefined
  >(undefined);

  // Modal states for skipping
  const [skippingQuestion, setSkippingQuestion] =
    useState<ReflectionQuestion | null>(null);
  const [skippingCycleProgress, setSkippingCycleProgress] =
    useState<ActiveCohortProgressDetail | null>(null);
  const [skippingForDate, setSkippingForDate] = useState<string | undefined>(
    undefined,
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle answering
  const handleOpenAnswer = (
    q: ReflectionQuestion,
    cycleProgress: ActiveCohortProgressDetail | null = null,
    forDate?: string,
    existingReflection?: UserReflection | null,
  ) => {
    setAnsweringQuestion(q);
    setAnsweringCycleProgress(cycleProgress);
    setAnsweringForDate(forDate);
    setAnsweringInitialContent(existingReflection?.content ?? undefined);
    setAnsweringInitialNumericValue(
      existingReflection?.numericValue ?? undefined,
    );
    setAnsweringInitialItems(
      existingReflection?.items?.map((it) => ({
        id: it.id,
        content: it.content,
      })) ?? undefined,
    );
  };

  const handleConfirmAnswer = async (input: {
    content?: string;
    numericValue?: number;
    items?: { id?: EntityId; content: string }[];
  }) => {
    if (!answeringQuestion) return;

    try {
      setIsSubmitting(true);
      if (answeringCycleProgress) {
        await submitCycleReflection(answeringCycleProgress, answeringQuestion, {
          ...input,
          forDate: answeringForDate,
        });
      } else {
        await submitDailyReflection(answeringQuestion, {
          ...input,
          forDate: answeringForDate,
        });
      }
      setAnsweringQuestion(null);
      setAnsweringCycleProgress(null);
      setAnsweringForDate(undefined);
      setAnsweringInitialContent(undefined);
      setAnsweringInitialNumericValue(undefined);
      setAnsweringInitialItems(undefined);
    } catch (err) {
      console.error("Failed to save reflection:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle skipping
  const handleOpenSkip = (
    q: ReflectionQuestion,
    cycleProgress: ActiveCohortProgressDetail | null = null,
    forDate?: string,
  ) => {
    setSkippingQuestion(q);
    setSkippingCycleProgress(cycleProgress);
    setSkippingForDate(forDate);
  };

  const handleConfirmSkip = async (reason: string) => {
    if (!skippingQuestion) return;

    try {
      setIsSubmitting(true);
      if (skippingCycleProgress) {
        await skipCycleQuestion(
          skippingCycleProgress,
          skippingQuestion,
          reason,
          skippingForDate,
        );
      } else {
        await skipDailyQuestion(skippingQuestion, reason, skippingForDate);
      }
      setSkippingQuestion(null);
      setSkippingCycleProgress(null);
      setSkippingForDate(undefined);
    } catch (err) {
      console.error("Failed to skip question:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEnroll = async (cohort: ThemeCohort) => {
    try {
      setIsSubmitting(true);
      await enroll(cohort.themeId, cohort.id, {
        forDate: currentLocalDate,
      });
    } catch (err) {
      console.error("Failed to enroll:", err);
      Alert.alert(
        "Inscripción no disponible",
        err instanceof Error
          ? err.message
          : "No fue posible unirte a este programa en este momento.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLeaveCohort = async (cohortId: EntityId) => {
    try {
      setIsSubmitting(true);
      await leaveCohort(cohortId);
    } catch (err) {
      console.error("Failed to leave cohort:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isDailyLoading || isCohortLoading;

  const prefMap = new Map(preferences.map((p) => [p.questionId, p]));

  const { availableRoutineQuestions, upcomingRoutineQuestions } =
    useMemo(() => {
      const available: ReflectionQuestion[] = [];
      const upcoming: ReflectionQuestion[] = [];

      for (const q of routineQuestions) {
        const ref = todayReflections[q.id];
        if (isReflectionLocked(q, ref, currentDateTime)) {
          upcoming.push(q);
        } else {
          available.push(q);
        }
      }

      return {
        availableRoutineQuestions: available,
        upcomingRoutineQuestions: upcoming,
      };
    }, [routineQuestions, todayReflections, currentDateTime]);

  const pendingMissedQuestions = useMemo(() => {
    return missedQuestions.filter(
      (item) => item.reflection?.status !== "answered",
    );
  }, [missedQuestions]);

  const pendingRoutineQuestions = useMemo(() => {
    return availableRoutineQuestions.filter(
      (q) => todayReflections[q.id]?.status !== "answered",
    );
  }, [availableRoutineQuestions, todayReflections]);

  const pendingPinned = useMemo(() => {
    return pinnedQuestions.filter(
      (q) => todayReflections[q.id]?.status !== "answered",
    );
  }, [pinnedQuestions, todayReflections]);

  const pendingAdHoc = useMemo(() => {
    return adHocQuestions.filter(
      (q) => todayReflections[q.id]?.status !== "answered",
    );
  }, [adHocQuestions, todayReflections]);

  const answeredQuestionsToday = useMemo(() => {
    const list: {
      question: ReflectionQuestion;
      reflection: UserReflection;
      dateLabel?: string;
    }[] = [];

    // 1. Missed questions completed today
    for (const item of missedQuestions) {
      if (item.reflection?.status === "answered") {
        list.push({
          question: item.question,
          reflection: item.reflection,
          dateLabel: `De: ${formatRelativeMissedDate(DateTime.from(item.missedDate))}`,
        });
      }
    }

    // 2. Routine questions answered today
    for (const q of availableRoutineQuestions) {
      const ref = todayReflections[q.id];
      if (ref?.status === "answered") {
        list.push({
          question: q,
          reflection: ref,
        });
      }
    }

    // 3. Ad-hoc/pinned questions answered today (avoid duplicates if in routine)
    for (const q of adHocQuestions) {
      const ref = todayReflections[q.id];
      if (
        ref?.status === "answered" &&
        !list.some((item) => item.question.id === q.id)
      ) {
        list.push({
          question: q,
          reflection: ref,
        });
      }
    }

    return list;
  }, [
    missedQuestions,
    availableRoutineQuestions,
    adHocQuestions,
    todayReflections,
  ]);

  return (
    <ScreenContainer.Tab>
      <Stack.Screen
        options={{
          title: "Reflexiones",
          headerLargeTitle: true,
          headerShadowVisible: false,
        }}
      />

      {/* Segmented Tab Switcher */}
      <SegmentedControl
        values={[
          { value: "daily", label: "Cola Diaria" },
          { value: "cohorts", label: "Programas" },
        ]}
        selectedValue={currentTab}
        onValueChange={(val) => setCurrentTab(val as "daily" | "cohorts")}
        style={styles.tabBar}
      />

      {isLoading ? (
        <Spinner.Centered size="lg" />
      ) : (
        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={styles.contentContainer}
          contentInsetAdjustmentBehavior="automatic"
        >
          {currentTab === "daily" ? (
            <>
              {/* ---------------------------------------------------- */}
              {/* MACRO-BLOCK 1: POR RESPONDER                        */}
              {/* ---------------------------------------------------- */}
              <View style={styles.sectionHeader}>
                <ThemedText variant="headline" style={styles.sectionTitle}>
                  Por Responder
                </ThemedText>
                <ThemedText
                  variant="caption1"
                  color={colors.secondaryLabel}
                  style={styles.sectionSubtitle}
                >
                  Tus reflexiones prioritarias de hoy.
                </ThemedText>
              </View>

              {/* Missed questions within grace window */}
              {pendingMissedQuestions.length > 0 && (
                <View style={styles.missedSection}>
                  <View
                    style={[
                      styles.missedNotice,
                      {
                        backgroundColor: colors.warningSubdued,
                        borderColor: colors.systemOrange,
                      },
                    ]}
                  >
                    <ThemedText
                      variant="headline"
                      color={colors.systemOrange}
                      style={styles.missedTitle}
                    >
                      ⏰ Pendientes de días anteriores
                    </ThemedText>
                    <ThemedText
                      variant="caption1"
                      color={colors.secondaryLabel}
                      style={styles.missedSubtitle}
                    >
                      Podés completarlas dentro de la ventana de gracia.
                    </ThemedText>
                  </View>
                  {pendingMissedQuestions.map(
                    ({ question, missedDate, reflection }) => (
                      <PromptCard
                        key={`missed-${question.id}-${missedDate}`}
                        question={question}
                        reflection={reflection}
                        dateLabel={formatRelativeMissedDate(
                          DateTime.from(missedDate),
                        )}
                        onAnswer={() =>
                          handleOpenAnswer(
                            question,
                            null,
                            missedDate,
                            reflection,
                          )
                        }
                        onSkip={() =>
                          handleOpenSkip(question, null, missedDate)
                        }
                      />
                    ),
                  )}
                </View>
              )}

              {/* Pending Routine Questions */}
              {pendingRoutineQuestions.length > 0 && (
                <View style={[styles.subsectionHeader, { marginTop: 12 }]}>
                  <ThemedText
                    variant="caption1"
                    color={colors.secondaryLabel}
                    style={styles.subsectionTitle}
                  >
                    Rutina del Día
                  </ThemedText>
                </View>
              )}
              {pendingRoutineQuestions.map((q) => {
                const pref = prefMap.get(q.id);
                const isEnabled = pref ? pref.isEnabled : true;
                return (
                  <PromptCard
                    key={q.id}
                    question={q}
                    isRoutine={true}
                    isRoutineEnabled={isEnabled}
                    onAnswer={() => handleOpenAnswer(q)}
                    onSkip={() => handleOpenSkip(q)}
                    onToggleOptOut={(enabled) =>
                      void handleToggleRoutineOptOut(q.id, enabled)
                    }
                  />
                );
              })}

              {/* Empty state when no pending questions */}
              {pendingMissedQuestions.length === 0 &&
                pendingRoutineQuestions.length === 0 && (
                  <EmptyState.Card
                    style={{ marginVertical: 6 }}
                    description={
                      upcomingRoutineQuestions.length > 0
                        ? "No tenés reflexiones pendientes por ahora. Las próximas se habilitan más tarde."
                        : answeredQuestionsToday.length > 0
                          ? "¡Completaste todas tus reflexiones de hoy! 🎉"
                          : "No tenés preguntas activas en tu rutina diaria."
                    }
                  />
                )}

              {/* Upcoming routine questions (time-locked) */}
              {upcomingRoutineQuestions.length > 0 && (
                <View style={styles.upcomingSection}>
                  <View style={styles.subsectionHeader}>
                    <ThemedText
                      variant="caption1"
                      color={colors.secondaryLabel}
                      style={styles.subsectionTitle}
                    >
                      ⏳ Más tarde hoy
                    </ThemedText>
                    <ThemedText
                      variant="caption1"
                      color={colors.secondaryLabel}
                      style={styles.subsectionSubtitle}
                    >
                      Se habilitan en su horario preferido para responder al
                      cerrar la jornada.
                    </ThemedText>
                  </View>
                  {upcomingRoutineQuestions.map((q) => {
                    const pref = prefMap.get(q.id);
                    const isEnabled = pref ? pref.isEnabled : true;
                    return (
                      <PromptCard
                        key={q.id}
                        question={q}
                        isRoutine={true}
                        isRoutineEnabled={isEnabled}
                        isLocked={true}
                        onAnswer={() => handleOpenAnswer(q)}
                        onSkip={() => handleOpenSkip(q)}
                        onToggleOptOut={(enabled) =>
                          void handleToggleRoutineOptOut(q.id, enabled)
                        }
                      />
                    );
                  })}
                </View>
              )}

              {/* Pinned shortcuts (pending) */}
              {pendingPinned.length > 0 && (
                <>
                  <View style={styles.sectionHeader}>
                    <ThemedText variant="headline" style={styles.sectionTitle}>
                      ★ Accesos Rápidos
                    </ThemedText>
                    <ThemedText
                      variant="caption1"
                      color={colors.secondaryLabel}
                      style={styles.sectionSubtitle}
                    >
                      Preguntas ancladas para responder cuando lo necesites.
                    </ThemedText>
                  </View>
                  {pendingPinned.map((q) => (
                    <PromptCard
                      key={`pinned-${q.id}`}
                      question={q}
                      isPinnedShortcut={true}
                      onAnswer={() => handleOpenAnswer(q)}
                      onToggleShortcut={(pinned) =>
                        void toggleAdHocShortcut(q.id, pinned)
                      }
                    />
                  ))}
                </>
              )}

              {/* Ad-Hoc catalog (pending) */}
              {pendingAdHoc.length > 0 && (
                <>
                  <View style={styles.sectionHeader}>
                    <ThemedText variant="headline" style={styles.sectionTitle}>
                      Bajo Demanda
                    </ThemedText>
                    <ThemedText
                      variant="caption1"
                      color={colors.secondaryLabel}
                      style={styles.sectionSubtitle}
                    >
                      Explorá y anclá preguntas para momentos específicos.
                    </ThemedText>
                  </View>
                  {pendingAdHoc.map((q) => {
                    const pref = prefMap.get(q.id);
                    const isPinned = pref ? pref.isPinnedShortcut : false;
                    return (
                      <PromptCard
                        key={`adhoc-${q.id}`}
                        question={q}
                        isPinnedShortcut={isPinned}
                        onAnswer={() => handleOpenAnswer(q)}
                        onToggleShortcut={(pinned) =>
                          void toggleAdHocShortcut(q.id, pinned)
                        }
                      />
                    );
                  })}
                </>
              )}

              {/* ---------------------------------------------------- */}
              {/* MACRO-BLOCK 2: RESPONDIDAS HOY                      */}
              {/* ---------------------------------------------------- */}
              {answeredQuestionsToday.length > 0 && (
                <Collapsible
                  open={showAnswered}
                  onOpenChange={setShowAnswered}
                  style={styles.answeredMacroBlock}
                >
                  <View style={styles.macroBlockHeader}>
                    <View style={{ flex: 1 }}>
                      <ThemedText
                        variant="headline"
                        style={styles.sectionTitle}
                      >
                        Respondidas Hoy ({answeredQuestionsToday.length})
                      </ThemedText>
                      <ThemedText
                        variant="caption1"
                        color={colors.secondaryLabel}
                        style={styles.sectionSubtitle}
                      >
                        Tus reflexiones guardadas. Podés editarlas cuando
                        quieras.
                      </ThemedText>
                    </View>
                    <NativeSwitch
                      testID="toggle-show-answered"
                      value={showAnswered}
                      onValueChange={setShowAnswered}
                      accessibilityLabel="Mostrar respondidas"
                    />
                  </View>

                  <Collapsible.Content style={{ marginTop: 6 }}>
                    {answeredQuestionsToday.map(
                      ({ question, reflection, dateLabel }) => (
                        <PromptCard
                          key={`answered-${question.id}-${reflection.id}`}
                          question={question}
                          reflection={reflection}
                          dateLabel={dateLabel}
                          hideStatusBadge={true}
                          onAnswer={() =>
                            handleOpenAnswer(
                              question,
                              null,
                              reflection.forDate,
                              reflection,
                            )
                          }
                        />
                      ),
                    )}
                  </Collapsible.Content>
                </Collapsible>
              )}

              {/* ---------------------------------------------------- */}
              {/* MACRO-BLOCK 3: PREGUNTAS PAUSADAS                    */}
              {/* ---------------------------------------------------- */}
              {optedOutRoutineQuestions.length > 0 && (
                <Collapsible
                  open={showPaused}
                  onOpenChange={setShowPaused}
                  style={styles.answeredMacroBlock}
                >
                  <View style={styles.macroBlockHeader}>
                    <View style={{ flex: 1 }}>
                      <ThemedText
                        variant="headline"
                        style={styles.sectionTitle}
                      >
                        Preguntas Pausadas ({optedOutRoutineQuestions.length})
                      </ThemedText>
                      <ThemedText
                        variant="caption1"
                        color={colors.secondaryLabel}
                        style={styles.sectionSubtitle}
                      >
                        Preguntas dadas de baja de tu rutina. Podés reactivarlas
                        cuando quieras.
                      </ThemedText>
                    </View>
                    <NativeSwitch
                      testID="toggle-show-paused"
                      value={showPaused}
                      onValueChange={setShowPaused}
                      accessibilityLabel="Mostrar preguntas pausadas"
                    />
                  </View>

                  <Collapsible.Content style={styles.pausedContent}>
                    {optedOutRoutineQuestions.map((q) => (
                      <PromptCard
                        key={`opted-out-${q.id}`}
                        question={q}
                        isRoutine={true}
                        isRoutineEnabled={false}
                        onAnswer={() => handleOpenAnswer(q)}
                        onToggleOptOut={(enabled) =>
                          void handleToggleRoutineOptOut(q.id, enabled)
                        }
                      />
                    ))}
                  </Collapsible.Content>
                </Collapsible>
              )}
            </>
          ) : (
            <>
              {/* Active Cohorts Progress */}
              <View style={styles.sectionHeader}>
                <ThemedText variant="headline" style={styles.sectionTitle}>
                  Tus Programas en Curso
                </ThemedText>
                <ThemedText
                  variant="caption1"
                  color={colors.secondaryLabel}
                  style={styles.sectionSubtitle}
                >
                  Ciclos progresivos estructurados día a día.
                </ThemedText>
              </View>

              {activeCohorts.length === 0 ? (
                <EmptyState.Card
                  style={{ marginVertical: 8 }}
                  description="No estás inscripto en ningún programa actualmente. Sumate a uno abajo."
                />
              ) : (
                activeCohorts.map((active) => (
                  <Card
                    key={active.id}
                    variant="subdued"
                    padding="none"
                    style={styles.cohortBox}
                  >
                    <View style={styles.cohortHeaderRow}>
                      <ThemedText
                        variant="headline"
                        style={[styles.cohortTitle, { flex: 1 }]}
                      >
                        {active.theme.title}
                      </ThemedText>
                      {active.status === "in_progress" && (
                        <ChipButton
                          title="Bajarme"
                          variant="destructive"
                          disabled={isSubmitting}
                          accessibilityLabel="Bajarme del programa"
                          onPress={() =>
                            void handleLeaveCohort(active.cohortId)
                          }
                        />
                      )}
                    </View>

                    <CycleProgressBadge
                      currentStep={active.currentStep}
                      totalSteps={active.theme.targetQuestionCount}
                      answeredCount={active.answeredCount}
                      skippedCount={active.skippedCount}
                      status={active.status}
                    />

                    {!isCohortStarted(active.cohort.programStartDate) ? (
                      <View
                        style={{
                          marginTop: 12,
                          padding: 16,
                          borderRadius: 12,
                          backgroundColor: colors.systemGray15,
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <ThemedText
                          variant="callout"
                          style={{
                            fontWeight: "600",
                          }}
                        >
                          📅 El programa comienza el{" "}
                          {formatDateDDMM(active.cohort.programStartDate)}
                        </ThemedText>
                        <ThemedText
                          variant="caption1"
                          color={colors.secondaryLabel}
                          style={{
                            textAlign: "center",
                            lineHeight: 18,
                          }}
                        >
                          Estás inscripto en esta convocatoria. El programa
                          comienza el{" "}
                          {formatDateDDMM(active.cohort.programStartDate)}. La
                          primera reflexión se desbloqueará automáticamente ese
                          día.
                        </ThemedText>
                      </View>
                    ) : (
                      <>
                        {active.currentQuestion &&
                          active.status !== "completed" &&
                          (!isCohortStepUnlocked(
                            active.cohort.programStartDate,
                            active.currentStep,
                          ) ? (
                            <View
                              style={{
                                marginTop: 12,
                                padding: 16,
                                borderRadius: 12,
                                backgroundColor: colors.systemGray15,
                                alignItems: "center",
                                gap: 6,
                              }}
                            >
                              <ThemedText
                                variant="callout"
                                style={{
                                  fontWeight: "600",
                                }}
                              >
                                ✨ Paso de hoy completado
                              </ThemedText>
                              <ThemedText
                                variant="caption1"
                                color={colors.secondaryLabel}
                                style={{
                                  textAlign: "center",
                                  lineHeight: 18,
                                }}
                              >
                                El Paso {active.currentStep} se desbloqueará el{" "}
                                {formatDateDDMM(
                                  getCohortStepUnlockDate(
                                    active.cohort.programStartDate,
                                    active.currentStep,
                                  ),
                                )}
                                . ¡Excelente constancia con tu práctica diaria!
                              </ThemedText>
                            </View>
                          ) : (
                            <View style={{ marginTop: 10 }}>
                              <ThemedText
                                variant="caption1"
                                color={colors.secondaryLabel}
                                style={styles.subHeader}
                              >
                                Pregunta de hoy (Paso {active.currentStep}):
                              </ThemedText>
                              <PromptCard
                                question={active.currentQuestion}
                                onAnswer={() =>
                                  handleOpenAnswer(
                                    active.currentQuestion!,
                                    active,
                                  )
                                }
                                onSkip={() =>
                                  handleOpenSkip(
                                    active.currentQuestion!,
                                    active,
                                  )
                                }
                              />
                            </View>
                          ))}

                        {/* Completed steps in this cohort */}
                        {(() => {
                          const refs = cycleReflections[active.id] ?? [];
                          const allQ = cohortQuestions[active.id] ?? [];
                          const completedSteps = refs
                            .map((ref) => {
                              const q = allQ.find(
                                (item) => item.id === ref.questionId,
                              );
                              return q
                                ? { question: q, reflection: ref }
                                : null;
                            })
                            .filter(
                              (
                                item,
                              ): item is {
                                question: ReflectionQuestion;
                                reflection: UserReflection;
                              } => item !== null,
                            )
                            .sort(
                              (a, b) =>
                                a.question.orderIndex - b.question.orderIndex,
                            );

                          if (completedSteps.length === 0 || !showAnswered)
                            return null;

                          return (
                            <Accordion
                              type="single"
                              collapsible
                              defaultValue={`cohort-completed-${active.id}`}
                              style={{ marginTop: 14 }}
                            >
                              <Accordion.Item
                                value={`cohort-completed-${active.id}`}
                                style={{ borderBottomWidth: 0 }}
                              >
                                <Accordion.Header>
                                  <Accordion.Trigger
                                    style={{
                                      paddingVertical: 6,
                                      minHeight: 36,
                                    }}
                                  >
                                    <ThemedText
                                      variant="callout"
                                      color={colors.secondaryLabel}
                                      style={{ fontWeight: "600" }}
                                    >
                                      Pasos completados ({completedSteps.length}
                                      )
                                    </ThemedText>
                                  </Accordion.Trigger>
                                </Accordion.Header>
                                <Accordion.Content
                                  style={{ gap: 8, paddingBottom: 4 }}
                                >
                                  {completedSteps.map(
                                    ({ question, reflection }) => (
                                      <PromptCard
                                        key={`cohort-step-${active.id}-${question.id}`}
                                        question={question}
                                        reflection={reflection}
                                        dateLabel={`Paso ${question.orderIndex} • ${formatDateDDMM(DateTime.from(reflection.forDate))}`}
                                        onAnswer={() =>
                                          handleOpenAnswer(
                                            question,
                                            active,
                                            reflection.forDate,
                                            reflection,
                                          )
                                        }
                                      />
                                    ),
                                  )}
                                </Accordion.Content>
                              </Accordion.Item>
                            </Accordion>
                          );
                        })()}
                      </>
                    )}
                  </Card>
                ))
              )}

              {/* Open Cohorts Catalog */}
              <View style={styles.sectionHeader}>
                <ThemedText variant="headline" style={styles.sectionTitle}>
                  Convocatorias Disponibles
                </ThemedText>
                <ThemedText
                  variant="caption1"
                  color={colors.secondaryLabel}
                  style={styles.sectionSubtitle}
                >
                  Inscribite a nuevos ciclos temáticos.
                </ThemedText>
              </View>

              {openCohorts.map((cohort) => {
                const theme = themes.find((t) => t.id === cohort.themeId);
                const isAlreadyEnrolled = activeCohorts.some(
                  (a) => a.cohortId === cohort.id && a.status === "in_progress",
                );

                return (
                  <CohortEnrollmentCard
                    key={cohort.id}
                    cohort={cohort}
                    theme={theme}
                    isEnrolled={isAlreadyEnrolled}
                    onEnroll={() => void handleEnroll(cohort)}
                    isSubmitting={isSubmitting}
                    currentDate={currentLocalDate}
                  />
                );
              })}
            </>
          )}
        </ScrollView>
      )}

      {/* Answering Modal */}
      <ReflectionModal
        visible={answeringQuestion !== null}
        question={answeringQuestion}
        initialContent={answeringInitialContent}
        initialNumericValue={answeringInitialNumericValue}
        initialItems={answeringInitialItems}
        onSave={(input) => void handleConfirmAnswer(input)}
        onClose={() => {
          setAnsweringQuestion(null);
          setAnsweringCycleProgress(null);
          setAnsweringForDate(undefined);
          setAnsweringInitialContent(undefined);
          setAnsweringInitialNumericValue(undefined);
          setAnsweringInitialItems(undefined);
        }}
        isSubmitting={isSubmitting}
      />

      {/* Skipping Sheet */}
      <SkipReasonSheet
        visible={skippingQuestion !== null}
        promptText={skippingQuestion?.prompt ?? ""}
        onConfirm={(reason) => void handleConfirmSkip(reason)}
        onCancel={() => {
          setSkippingQuestion(null);
          setSkippingCycleProgress(null);
          setSkippingForDate(undefined);
        }}
        isSubmitting={isSubmitting}
      />
    </ScreenContainer.Tab>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  tabBar: {
    marginHorizontal: layout.screenHorizontalPadding,
    marginVertical: 10,
  },
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: layout.screenHorizontalPadding,
    paddingBottom: 28,
  },
  sectionHeader: {
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  sectionSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  upcomingSection: {
    marginTop: 20,
    marginBottom: 6,
  },
  subsectionHeader: {
    marginBottom: 8,
  },
  subsectionTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  subsectionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  missedSection: {
    marginVertical: 4,
  },
  missedNotice: {
    padding: layout.cardPadding,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 6,
  },
  missedTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  missedSubtitle: {
    fontSize: 12,
  },
  cohortBox: {
    padding: layout.cardPadding,
    borderRadius: 20,
    marginVertical: 10,
  },
  cohortTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  cohortHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: 8,
  },
  subHeader: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
  },
  answeredMacroBlock: {
    marginTop: 28,
    paddingTop: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.systemGray15,
  },
  macroBlockHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.compact,
    marginBottom: 6,
  },
  pausedContent: {
    marginTop: spacing.sm,
  },
});
