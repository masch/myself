import { useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Switch,
} from "react-native";
import { Stack, useFocusEffect } from "expo-router";
import {
  type EntityId,
  type ReflectionQuestion,
  type ThemeCohort,
  type UserReflection,
} from "@myself/shared";
import { colors } from "@/theme/colors";
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
  getCurrentTimeHHMM,
  isReflectionLocked,
  isCohortStarted,
  formatDateDDMM,
  formatRelativeMissedDate,
} from "@/features/reflections/domain/time-lock";

type SectionTab = "daily" | "cohorts";

export default function ReflectionsScreen() {
  const [currentTab, setCurrentTab] = useState<SectionTab>("daily");

  const {
    routineQuestions,
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

  const [currentTimeStr, setCurrentTimeStr] = useState(() =>
    getCurrentTimeHHMM(),
  );
  const [showAnswered, setShowAnswered] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setCurrentTimeStr(getCurrentTimeHHMM());
      void refreshDaily();
      void refreshCohorts();
    }, [refreshDaily, refreshCohorts]),
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeStr(getCurrentTimeHHMM());
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
  };

  const handleConfirmAnswer = async (input: {
    content?: string;
    numericValue?: number;
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
      await enroll(cohort.themeId, cohort.id);
    } catch (err) {
      console.error("Failed to enroll:", err);
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
        if (isReflectionLocked(q, ref, currentTimeStr)) {
          upcoming.push(q);
        } else {
          available.push(q);
        }
      }

      return {
        availableRoutineQuestions: available,
        upcomingRoutineQuestions: upcoming,
      };
    }, [routineQuestions, todayReflections, currentTimeStr]);

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
          dateLabel: `De: ${formatRelativeMissedDate(item.missedDate)}`,
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
    <View style={[styles.screen, { backgroundColor: colors.systemBackground }]}>
      <Stack.Screen
        options={{
          title: "Reflexiones",
          headerLargeTitle: true,
          headerShadowVisible: false,
        }}
      />

      {/* Segmented Tab Switcher */}
      <View
        style={[
          styles.tabBar,
          { backgroundColor: colors.secondarySystemBackground },
        ]}
      >
        <Pressable
          onPress={() => setCurrentTab("daily")}
          style={[
            styles.tabItem,
            currentTab === "daily" && [
              styles.tabItemActive,
              { backgroundColor: colors.systemBlue },
            ],
          ]}
        >
          <Text
            style={[
              styles.tabText,
              {
                color:
                  currentTab === "daily" ? colors.white : colors.secondaryLabel,
                fontWeight: currentTab === "daily" ? "700" : "500",
              },
            ]}
          >
            Cola Diaria
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setCurrentTab("cohorts")}
          style={[
            styles.tabItem,
            currentTab === "cohorts" && [
              styles.tabItemActive,
              { backgroundColor: colors.systemBlue },
            ],
          ]}
        >
          <Text
            style={[
              styles.tabText,
              {
                color:
                  currentTab === "cohorts"
                    ? colors.white
                    : colors.secondaryLabel,
                fontWeight: currentTab === "cohorts" ? "700" : "500",
              },
            ]}
          >
            Programas
          </Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.systemBlue} />
        </View>
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
                <Text style={[styles.sectionTitle, { color: colors.label }]}>
                  Por Responder
                </Text>
                <Text
                  style={[
                    styles.sectionSubtitle,
                    { color: colors.secondaryLabel },
                  ]}
                >
                  Tus reflexiones prioritarias de hoy.
                </Text>
              </View>

              {/* Missed questions within grace window */}
              {pendingMissedQuestions.length > 0 && (
                <View
                  style={[
                    styles.missedNotice,
                    { backgroundColor: "rgba(255, 149, 0, 0.15)" },
                  ]}
                >
                  <Text
                    style={[styles.missedTitle, { color: colors.systemOrange }]}
                  >
                    ⏰ Pendientes de días anteriores
                  </Text>
                  <Text
                    style={[
                      styles.missedSubtitle,
                      { color: colors.secondaryLabel },
                    ]}
                  >
                    Podés completarlas dentro de la ventana de gracia.
                  </Text>
                  {pendingMissedQuestions.map(
                    ({ question, missedDate, reflection }) => (
                      <PromptCard
                        key={`missed-${question.id}-${missedDate}`}
                        question={question}
                        reflection={reflection}
                        dateLabel={formatRelativeMissedDate(missedDate)}
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
                  <Text
                    style={[
                      styles.subsectionTitle,
                      { color: colors.secondaryLabel },
                    ]}
                  >
                    Rutina del Día
                  </Text>
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
                      void toggleRoutineOptOut(q.id, enabled)
                    }
                  />
                );
              })}

              {/* Empty state when no pending questions */}
              {pendingMissedQuestions.length === 0 &&
                pendingRoutineQuestions.length === 0 && (
                  <View
                    style={[
                      styles.emptyCard,
                      {
                        backgroundColor: colors.secondarySystemBackground,
                        marginVertical: 6,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.emptyText,
                        { color: colors.secondaryLabel },
                      ]}
                    >
                      {upcomingRoutineQuestions.length > 0
                        ? "No tenés reflexiones pendientes por ahora. Las próximas se habilitan más tarde."
                        : answeredQuestionsToday.length > 0
                          ? "¡Completaste todas tus reflexiones de hoy! 🎉"
                          : "No tenés preguntas activas en tu rutina diaria."}
                    </Text>
                  </View>
                )}

              {/* Upcoming routine questions (time-locked) */}
              {upcomingRoutineQuestions.length > 0 && (
                <View style={styles.upcomingSection}>
                  <View style={styles.subsectionHeader}>
                    <Text
                      style={[
                        styles.subsectionTitle,
                        { color: colors.secondaryLabel },
                      ]}
                    >
                      ⏳ Más tarde hoy
                    </Text>
                    <Text
                      style={[
                        styles.subsectionSubtitle,
                        { color: colors.secondaryLabel },
                      ]}
                    >
                      Se habilitan en su horario preferido para responder al
                      cerrar la jornada.
                    </Text>
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
                          void toggleRoutineOptOut(q.id, enabled)
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
                    <Text
                      style={[styles.sectionTitle, { color: colors.label }]}
                    >
                      ★ Accesos Rápidos
                    </Text>
                    <Text
                      style={[
                        styles.sectionSubtitle,
                        { color: colors.secondaryLabel },
                      ]}
                    >
                      Preguntas ancladas para responder cuando lo necesites.
                    </Text>
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
                    <Text
                      style={[styles.sectionTitle, { color: colors.label }]}
                    >
                      Bajo Demanda
                    </Text>
                    <Text
                      style={[
                        styles.sectionSubtitle,
                        { color: colors.secondaryLabel },
                      ]}
                    >
                      Explorá y anclá preguntas para momentos específicos.
                    </Text>
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
                <View style={styles.answeredMacroBlock}>
                  <View style={styles.macroBlockHeader}>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.sectionTitle, { color: colors.label }]}
                      >
                        Respondidas Hoy ({answeredQuestionsToday.length})
                      </Text>
                      <Text
                        style={[
                          styles.sectionSubtitle,
                          { color: colors.secondaryLabel },
                        ]}
                      >
                        Tus reflexiones guardadas. Podés editarlas cuando
                        quieras.
                      </Text>
                    </View>
                    <Switch
                      testID="toggle-show-answered"
                      value={showAnswered}
                      onValueChange={setShowAnswered}
                      trackColor={{
                        false: colors.systemGray15,
                        true: colors.systemGreen,
                      }}
                      accessibilityRole="switch"
                      accessibilityLabel="Mostrar respondidas"
                    />
                  </View>

                  {showAnswered && (
                    <View style={{ marginTop: 6 }}>
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
                    </View>
                  )}
                </View>
              )}
            </>
          ) : (
            <>
              {/* Active Cohorts Progress */}
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.label }]}>
                  Tus Programas en Curso
                </Text>
                <Text
                  style={[
                    styles.sectionSubtitle,
                    { color: colors.secondaryLabel },
                  ]}
                >
                  Ciclos progresivos estructurados día a día.
                </Text>
              </View>

              {activeCohorts.length === 0 ? (
                <View
                  style={[
                    styles.emptyCard,
                    { backgroundColor: colors.secondarySystemBackground },
                  ]}
                >
                  <Text
                    style={[styles.emptyText, { color: colors.secondaryLabel }]}
                  >
                    No estás inscripto en ningún programa actualmente. Sumate a
                    uno abajo.
                  </Text>
                </View>
              ) : (
                activeCohorts.map((active) => (
                  <View
                    key={active.id}
                    style={[
                      styles.cohortBox,
                      { backgroundColor: colors.secondarySystemBackground },
                    ]}
                  >
                    <View style={styles.cohortHeaderRow}>
                      <Text
                        style={[
                          styles.cohortTitle,
                          { color: colors.label, flex: 1 },
                        ]}
                      >
                        {active.theme.title}
                      </Text>
                      {active.status === "in_progress" && (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Bajarme del programa"
                          disabled={isSubmitting}
                          onPress={() =>
                            void handleLeaveCohort(active.cohortId)
                          }
                          style={[
                            styles.leaveCohortBtn,
                            { opacity: isSubmitting ? 0.5 : 1 },
                          ]}
                        >
                          <Text style={styles.leaveCohortBtnText}>Bajarme</Text>
                        </Pressable>
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
                        <Text
                          style={{
                            fontSize: 15,
                            fontWeight: "600",
                            color: colors.label,
                          }}
                        >
                          📅 El programa comienza el{" "}
                          {formatDateDDMM(active.cohort.programStartDate)}
                        </Text>
                        <Text
                          style={{
                            fontSize: 13,
                            color: colors.secondaryLabel,
                            textAlign: "center",
                            lineHeight: 18,
                          }}
                        >
                          Estás inscripto en esta convocatoria. El programa
                          comienza el{" "}
                          {formatDateDDMM(active.cohort.programStartDate)}. La
                          primera reflexión se desbloqueará automáticamente ese
                          día.
                        </Text>
                      </View>
                    ) : (
                      <>
                        {active.currentQuestion &&
                          active.status !== "completed" && (
                            <View style={{ marginTop: 10 }}>
                              <Text
                                style={[
                                  styles.subHeader,
                                  { color: colors.secondaryLabel },
                                ]}
                              >
                                Pregunta de hoy (Paso {active.currentStep}):
                              </Text>
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
                          )}

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
                            <View style={{ marginTop: 14 }}>
                              <Text
                                style={[
                                  styles.subHeader,
                                  { color: colors.secondaryLabel },
                                ]}
                              >
                                Pasos completados ({completedSteps.length}):
                              </Text>
                              {completedSteps.map(
                                ({ question, reflection }) => (
                                  <PromptCard
                                    key={`cohort-step-${active.id}-${question.id}`}
                                    question={question}
                                    reflection={reflection}
                                    dateLabel={`Paso ${question.orderIndex} • ${formatDateDDMM(reflection.forDate)}`}
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
                            </View>
                          );
                        })()}
                      </>
                    )}
                  </View>
                ))
              )}

              {/* Open Cohorts Catalog */}
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.label }]}>
                  Convocatorias Disponibles
                </Text>
                <Text
                  style={[
                    styles.sectionSubtitle,
                    { color: colors.secondaryLabel },
                  ]}
                >
                  Inscribite a nuevos ciclos temáticos.
                </Text>
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
        onSave={(input) => void handleConfirmAnswer(input)}
        onClose={() => {
          setAnsweringQuestion(null);
          setAnsweringCycleProgress(null);
          setAnsweringForDate(undefined);
          setAnsweringInitialContent(undefined);
          setAnsweringInitialNumericValue(undefined);
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  tabBar: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 14,
    padding: 4,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  tabItemActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 40,
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
  missedNotice: {
    padding: 14,
    borderRadius: 16,
    marginVertical: 10,
  },
  missedTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  missedSubtitle: {
    fontSize: 12,
    marginBottom: 8,
  },
  emptyCard: {
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    marginVertical: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
  },
  cohortBox: {
    padding: 16,
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
  leaveCohortBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: colors.systemGray15,
  },
  leaveCohortBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.systemRed,
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
    gap: 12,
    marginBottom: 6,
  },
});
