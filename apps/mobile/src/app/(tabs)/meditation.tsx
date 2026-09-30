import { useState, useEffect, useRef } from "react";
import { View, StyleSheet, Alert } from "react-native";
import { Image } from "expo-image";
import { useKeepAwake } from "expo-keep-awake";
import {
  isDndActive,
  isDndCheckSupported,
  isNotificationPolicyAccessGranted,
  setDndActive,
  openDndSettings,
} from "@/modules/dnd-status";
import { useMeditation } from "@/hooks/use-meditation";
import { useReadings } from "@/hooks/use-readings";
import {
  AppButton,
  AppIcon,
  Badge,
  ChipButton,
  EmptyState,
  StepperButton,
  MeditationText,
  ScreenContainer,
  Collapsible,
  ThemedText,
  Card,
  NativeSwitch,
} from "@/components";

import { colors, shadows, spacing } from "@/theme";

function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function formatClock(hour: number, minute: number): string {
  const h = hour.toString().padStart(2, "0");
  const m = minute.toString().padStart(2, "0");
  return `${h}:${m}`;
}

export default function MeditationScreen() {
  useKeepAwake();
  const {
    status,
    moments,
    currentMomentIndex,
    currentMoment,
    isWaitingForScheduledTime,
    elapsedSeconds,
    targetHour,
    targetMinute,
    alarmEnabled,
    setTargetHour,
    setTargetMinute,
    setAlarmEnabled,
    startSession,
    pauseSession,
    resumeSession,
    nextMoment,
    resetSession,
    playSingleGong,
    playTripleGong,
  } = useMeditation();

  const { readings, recordRead } = useReadings();
  const [currentReadingOffset, setCurrentReadingOffset] = useState(0);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [showDndNotice, setShowDndNotice] = useState(false);

  const recordedSessionReadingIdRef = useRef<string | null>(null);

  const incrementHour = () => setTargetHour((prev) => (prev + 1) % 24);
  const decrementHour = () => setTargetHour((prev) => (prev - 1 + 24) % 24);
  const incrementMinute = () => setTargetMinute((prev) => (prev + 1) % 60);
  const decrementMinute = () => setTargetMinute((prev) => (prev - 1 + 60) % 60);

  const isRunning = status === "running";
  const isPaused = status === "paused";
  const isCompleted = status === "completed";
  const isIdle = status === "idle";

  // Prioritize unread readings (times_read === 0), fallback to all readings
  const unreadReadings = readings.filter((r) => r.times_read === 0);
  const candidateReadings =
    unreadReadings.length > 0 ? unreadReadings : readings;
  const activeReading =
    candidateReadings.length > 0
      ? candidateReadings[currentReadingOffset % candidateReadings.length]
      : null;

  // Auto-record reading log as read when transitioning to Moment 2 (index 1) or beyond
  useEffect(() => {
    if (
      currentMomentIndex >= 1 &&
      activeReading &&
      recordedSessionReadingIdRef.current !== activeReading.id
    ) {
      recordedSessionReadingIdRef.current = activeReading.id;
      recordRead(activeReading.id).catch((err) => {
        console.error("Failed to auto-record reading log on Moment 2:", err);
      });
    }
  }, [currentMomentIndex, activeReading, recordRead]);

  // Turn off DND when session is completed
  useEffect(() => {
    if (
      status === "completed" &&
      isDndCheckSupported() &&
      isNotificationPolicyAccessGranted()
    ) {
      setDndActive(false);
    }
  }, [status]);

  const handleResetSession = () => {
    recordedSessionReadingIdRef.current = null;
    setShowDndNotice(false);
    if (isDndCheckSupported() && isNotificationPolicyAccessGranted()) {
      setDndActive(false);
    }
    void resetSession().catch(() => {});
  };

  const handleStartSession = () => {
    if (isDndCheckSupported()) {
      if (isNotificationPolicyAccessGranted()) {
        // Granted: silence automatically
        setDndActive(true);
      } else {
        const dnd = isDndActive();
        if (!dnd) {
          Alert.alert(
            "Modo No Molestar Requerido",
            "Para no recibir interrupciones durante la meditación, permitile el acceso a No Molestar a la app Myself en los ajustes o activalo manualmente.",
            [
              {
                text: "Abrir Ajustes",
                onPress: () => openDndSettings(),
              },
              {
                text: "Cancelar",
                style: "cancel",
              },
            ],
            { cancelable: false },
          );
          return;
        }
      }
    }

    recordedSessionReadingIdRef.current = null;
    setShowDndNotice(false);
    void startSession().catch(() => {});
  };

  return (
    <ScreenContainer.Scroll>
      {/* Main Timer Display Card */}
      <Card variant="elevated" padding="none" style={styles.timerCard}>
        <Badge
          variant={
            isRunning
              ? "primary"
              : isCompleted
                ? "success"
                : isPaused
                  ? "warning"
                  : "neutral"
          }
          label={
            isIdle
              ? "LISTO PARA COMENZAR"
              : isRunning
                ? "EN MEDITACIÓN"
                : isPaused
                  ? "EN PAUSA"
                  : "SESIÓN COMPLETADA"
          }
        />

        <ThemedText variant="largeTitle" style={styles.timerText}>
          {formatTime(elapsedSeconds)}
        </ThemedText>

        {/* Current Phase Indicator */}
        {!isIdle && !isCompleted && (
          <View style={styles.momentContainer}>
            <ThemedText
              variant="caption1"
              color={colors.systemBlue}
              style={styles.momentStep}
            >
              Momento {currentMomentIndex + 1} de {moments.length}
            </ThemedText>
            <ThemedText variant="title2" style={styles.momentTitle}>
              {currentMoment}
            </ThemedText>
            {isWaitingForScheduledTime && (
              <ThemedText
                variant="callout"
                color={colors.secondaryLabel}
                style={styles.scheduledNotice}
              >
                🔔 Avanzará al Momento 3 al llegar a las{" "}
                {formatClock(targetHour, targetMinute)} hs
              </ThemedText>
            )}
          </View>
        )}

        {isCompleted && (
          <View style={styles.momentContainer}>
            <ThemedText variant="title2" style={styles.momentTitle}>
              ¡Meditación Finalizada!
            </ThemedText>
            <ThemedText
              variant="callout"
              color={colors.secondaryLabel}
              style={styles.momentSubtitle}
            >
              Completaste los 3 momentos de la práctica.
            </ThemedText>
          </View>
        )}

        {/* Progress dots */}
        <View style={styles.dotsRow}>
          {moments.map((_, index) => {
            const isActive = !isIdle && index === currentMomentIndex;
            const isPassed = !isIdle && index < currentMomentIndex;
            return (
              <View
                key={index}
                style={[
                  styles.dot,
                  {
                    backgroundColor: isActive
                      ? colors.systemBlue
                      : isPassed
                        ? colors.label
                        : colors.secondaryLabel,
                    opacity: isActive ? 1 : isPassed ? 0.7 : 0.25,
                    transform: [{ scale: isActive ? 1.25 : 1 }],
                  },
                ]}
              />
            );
          })}
        </View>
      </Card>

      {/* DND Reminder Notice on Moment 1 if inactive or on iOS */}
      {showDndNotice && (isRunning || isPaused) && currentMomentIndex === 0 && (
        <Card
          variant="outlined"
          padding="none"
          style={[styles.dndNoticeCard, { borderColor: colors.systemPurple }]}
        >
          <View style={styles.dndNoticeHeader}>
            <View style={styles.dndNoticeLeft}>
              <Image
                source="sf:moon.fill"
                style={[
                  styles.dndNoticeIcon,
                  { tintColor: colors.systemPurple },
                ]}
              />
              <View style={{ flex: 1 }}>
                <ThemedText variant="headline" style={styles.dndNoticeTitle}>
                  {isDndCheckSupported()
                    ? "Modo No Molestar desactivado"
                    : "Sugerencia: activá No Molestar"}
                </ThemedText>
                <ThemedText
                  variant="caption1"
                  color={colors.secondaryLabel}
                  style={styles.dndNoticeSubtitle}
                >
                  {isDndCheckSupported()
                    ? "Detectamos que las notificaciones están activas. Te sugerimos poner el teléfono en No Molestar para meditar sin interrupciones."
                    : "Poné tu teléfono en modo Enfoque / No Molestar para meditar sin interrupciones."}
                </ThemedText>
              </View>
            </View>
            <ChipButton
              title="Entendido"
              variant="purple"
              onPress={() => setShowDndNotice(false)}
            />
          </View>
        </Card>
      )}

      {/* Reading Card: Selected before starting OR during Moment 1 */}
      {(isIdle || (!isCompleted && currentMomentIndex === 0)) && (
        <Card
          variant="subdued"
          padding="none"
          style={[
            styles.readingStepCard,
            { borderLeftColor: colors.systemPurple },
          ]}
        >
          {activeReading ? (
            <>
              <View style={styles.readingStepHeader}>
                <View style={styles.readingAuthorInfo}>
                  <Image
                    source="sf:book.closed.fill"
                    style={[
                      styles.readingStepIcon,
                      { tintColor: colors.systemPurple },
                    ]}
                  />
                  <View style={{ flex: 1 }}>
                    <ThemedText
                      variant="caption2"
                      color={colors.systemPurple}
                      style={styles.readingCardTag}
                    >
                      {isIdle
                        ? "LECTURA SELECCIONADA PARA LA SESIÓN"
                        : "MOMENTO 1: LECTURA Y REFLEXIÓN"}
                    </ThemedText>
                    <ThemedText
                      variant="headline"
                      style={styles.readingAuthorName}
                    >
                      {activeReading.author_name}
                    </ThemedText>
                    {activeReading.author_bio ? (
                      <ThemedText
                        variant="caption1"
                        color={colors.secondaryLabel}
                        style={styles.readingAuthorBio}
                      >
                        {activeReading.author_bio}
                      </ThemedText>
                    ) : null}
                  </View>
                </View>

                {candidateReadings.length > 1 && (
                  <ChipButton
                    title="Elegir otra"
                    icon="sf:arrow.triangle.2.circlepath"
                    variant="purple"
                    onPress={() => setCurrentReadingOffset((prev) => prev + 1)}
                  />
                )}
              </View>

              <View style={styles.quoteBox}>
                {Boolean(activeReading.title) && (
                  <ThemedText
                    variant="headline"
                    color={colors.systemPurple}
                    style={styles.readingTitle}
                  >
                    {activeReading.title}
                  </ThemedText>
                )}
                <MeditationText
                  content={activeReading.content}
                  baseFontSize={15}
                  baseLineHeight={23}
                  textColor={colors.label}
                  accentColor={colors.systemPurple}
                />
              </View>

              <View style={styles.readingFooter}>
                <ThemedText
                  variant="caption1"
                  color={colors.secondaryLabel}
                  style={styles.readCountBadge}
                >
                  {activeReading.times_read === 0
                    ? "✨ Texto nuevo (sin leer)"
                    : `📖 Leído ${activeReading.times_read} ${activeReading.times_read === 1 ? "vez" : "veces"}`}
                </ThemedText>

                <ThemedText
                  variant="caption2"
                  color={colors.secondaryLabel}
                  style={styles.autoRecordHint}
                >
                  {isIdle
                    ? "Se marcará como leído al pasar al Momento 2"
                    : "Pasa al Momento 2 para registrarla como leída"}
                </ThemedText>
              </View>
            </>
          ) : (
            <EmptyState
              icon="sf:book.closed"
              iconColor={colors.systemPurple}
              iconSize={40}
              title="Sin textos en la biblioteca"
              description="Podés crear nuevas lecturas en la pestaña 'Lecturas'."
              style={{ padding: spacing.lg }}
            />
          )}
        </Card>
      )}

      {/* Moment 2 & 3: Badge confirming read has been registered */}
      {!isIdle && !isCompleted && currentMomentIndex >= 1 && activeReading && (
        <Card
          variant="subdued"
          padding="none"
          style={styles.readRegisteredBadge}
        >
          <AppIcon
            name="sf:checkmark.circle.fill"
            size={20}
            color={colors.systemGreen}
          />
          <ThemedText variant="callout" style={styles.readRegisteredText}>
            Lectura de{" "}
            <ThemedText variant="callout" style={{ fontWeight: "600" }}>
              {activeReading.author_name}
            </ThemedText>{" "}
            registrada como leída en esta sesión.
          </ThemedText>
        </Card>
      )}

      {/* Primary Actions */}
      <View style={styles.actionSection}>
        {isIdle && (
          <AppButton
            title="Iniciar Meditación"
            subtitle="Suena 1 gong y comienza el Momento 1 con la lectura elegida"
            variant="primary"
            onPress={handleStartSession}
          />
        )}

        {(isRunning || isPaused) && (
          <View style={styles.runningControls}>
            {/* Context-aware Next/Finish Button */}
            {currentMomentIndex === 0 && (
              <AppButton
                title="Pasar a Meditación Programada (Momento 2)"
                subtitle="Registra la lectura como leída y suena 1 gong"
                variant="purple"
                onPress={nextMoment}
              />
            )}

            {currentMomentIndex === 1 && (
              <AppButton
                title="Avanzar a Momento 3 (Manual)"
                subtitle={`O esperar a las ${formatClock(targetHour, targetMinute)} para pase automático con 1 gong`}
                variant="gray"
                onPress={nextMoment}
              />
            )}

            {currentMomentIndex === 2 && (
              <AppButton
                title="Finalizar Meditación (3 Gongs)"
                subtitle="Suena triple gong de cierre"
                variant="green"
                onPress={nextMoment}
              />
            )}

            <View style={styles.secondaryControlsRow}>
              <AppButton
                title={isRunning ? "Pausar" : "Reanudar"}
                variant="secondary"
                style={styles.flex1}
                onPress={isRunning ? pauseSession : resumeSession}
              />

              <AppButton
                title="Reiniciar"
                variant="secondary"
                titleStyle={{ color: colors.systemRed }}
                style={styles.flex1}
                onPress={handleResetSession}
              />
            </View>
          </View>
        )}

        {isCompleted && (
          <AppButton
            title="Nueva Meditación"
            variant="primary"
            onPress={handleResetSession}
          />
        )}
      </View>

      {/* Scheduled Clock Alarm Settings & Sound test */}
      <View style={styles.settingsSection}>
        <View style={styles.groupContainer}>
          <ThemedText
            variant="caption1"
            color={colors.secondaryLabel}
            style={styles.sectionTitle}
          >
            CONFIGURACIÓN DE ALARMA Y SONIDOS
          </ThemedText>

          <Card variant="subdued" padding="none" style={styles.card}>
            {/* Alarm Active Switch */}
            <View style={styles.settingRow}>
              <Image
                source="sf:bell.fill"
                style={[styles.iconSetting, { tintColor: colors.systemOrange }]}
              />
              <View style={styles.settingContent}>
                <ThemedText variant="body" style={styles.settingTitle}>
                  Alarma de Pared Programada
                </ThemedText>
                <ThemedText
                  variant="caption1"
                  color={colors.secondaryLabel}
                  style={styles.settingSubtitle}
                >
                  Suena 1 gong al llegar a la hora objetivo
                </ThemedText>
              </View>
              <NativeSwitch
                value={alarmEnabled}
                onValueChange={setAlarmEnabled}
                accessibilityLabel="Alarma de Pared Programada"
              />
            </View>

            <View style={styles.divider} />

            {/* Target Time Setting Collapsible */}
            <Collapsible open={isConfigOpen} onOpenChange={setIsConfigOpen}>
              <View style={styles.settingRow}>
                <Image
                  source="sf:clock.fill"
                  style={[styles.iconSetting, { tintColor: colors.systemBlue }]}
                />
                <View style={styles.settingContent}>
                  <ThemedText variant="body" style={styles.settingTitle}>
                    Hora Objetivo
                  </ThemedText>
                  <ThemedText
                    variant="caption1"
                    color={colors.secondaryLabel}
                    style={styles.settingSubtitle}
                  >
                    {formatClock(targetHour, targetMinute)} hs
                  </ThemedText>
                </View>
                <Collapsible.Trigger asChild>
                  <ChipButton
                    title={isConfigOpen ? "Cerrar" : "Editar"}
                    variant="blue"
                  />
                </Collapsible.Trigger>
              </View>

              <Collapsible.Content>
                <View style={styles.divider} />
                <View style={styles.timePickerContainer}>
                  {/* Hours column */}
                  <View style={styles.pickerColumn}>
                    <ThemedText
                      variant="caption2"
                      color={colors.secondaryLabel}
                      style={styles.pickerLabel}
                    >
                      HORA
                    </ThemedText>
                    <StepperButton direction="up" onPress={incrementHour} />
                    <ThemedText variant="title1" style={styles.pickerValue}>
                      {targetHour.toString().padStart(2, "0")}
                    </ThemedText>
                    <StepperButton direction="down" onPress={decrementHour} />
                  </View>

                  <ThemedText variant="title1" style={styles.colonSeparator}>
                    :
                  </ThemedText>

                  {/* Minutes column */}
                  <View style={styles.pickerColumn}>
                    <ThemedText
                      variant="caption2"
                      color={colors.secondaryLabel}
                      style={styles.pickerLabel}
                    >
                      MINUTO
                    </ThemedText>
                    <StepperButton direction="up" onPress={incrementMinute} />
                    <ThemedText variant="title1" style={styles.pickerValue}>
                      {targetMinute.toString().padStart(2, "0")}
                    </ThemedText>
                    <StepperButton direction="down" onPress={decrementMinute} />
                  </View>
                </View>
              </Collapsible.Content>
            </Collapsible>

            <View style={styles.divider} />

            {/* Test Single Gong */}
            <View style={styles.settingRow}>
              <Image
                source="sf:speaker.wave.2.fill"
                style={[styles.iconSetting, { tintColor: colors.systemPurple }]}
              />
              <View style={styles.settingContent}>
                <ThemedText variant="body" style={styles.settingTitle}>
                  Probar Gong Simple
                </ThemedText>
                <ThemedText
                  variant="caption1"
                  color={colors.secondaryLabel}
                  style={styles.settingSubtitle}
                >
                  Sonido de inicio y cambio de fase
                </ThemedText>
              </View>
              <ChipButton
                title="1 Gong"
                variant="blue"
                onPress={playSingleGong}
              />
            </View>

            <View style={styles.divider} />

            {/* Test Triple Gong */}
            <View style={styles.settingRow}>
              <Image
                source="sf:speaker.wave.3.fill"
                style={[styles.iconSetting, { tintColor: colors.systemGreen }]}
              />
              <View style={styles.settingContent}>
                <ThemedText variant="body" style={styles.settingTitle}>
                  Probar Triple Gong
                </ThemedText>
                <ThemedText
                  variant="caption1"
                  color={colors.secondaryLabel}
                  style={styles.settingSubtitle}
                >
                  Sonido de cierre de meditación
                </ThemedText>
              </View>
              <ChipButton
                title="3 Gongs"
                variant="success"
                onPress={playTripleGong}
              />
            </View>
          </Card>
        </View>
      </View>
    </ScreenContainer.Scroll>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  timerCard: {
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    borderCurve: "continuous",
    boxShadow: shadows.card,
    elevation: 3,
  },
  timerText: {
    fontSize: 60,
    fontWeight: "200",
    fontVariant: ["tabular-nums"],
    letterSpacing: 2,
    marginVertical: 4,
  },
  momentContainer: {
    alignItems: "center",
    marginTop: 10,
    marginBottom: 6,
  },
  momentStep: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  momentTitle: {
    fontSize: 19,
    fontWeight: "600",
    textAlign: "center",
  },
  scheduledNotice: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
    fontWeight: "500",
  },
  momentSubtitle: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 4,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 18,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  readingStepCard: {
    borderRadius: 20,
    padding: 18,
    gap: 12,
    borderCurve: "continuous",
    borderLeftWidth: 4,
  },
  readingStepHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  readingAuthorInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    flex: 1,
  },
  readingStepIcon: {
    width: 24,
    height: 24,
    marginTop: 2,
  },
  readingCardTag: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  readingAuthorName: {
    fontSize: 16,
    fontWeight: "700",
  },
  readingAuthorBio: {
    fontSize: 12,
  },
  quoteBox: {
    paddingLeft: 4,
    gap: 8,
  },
  readingTitle: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  reflectionText: {
    fontSize: 15,
    lineHeight: 22,
    fontStyle: "italic",
    marginTop: -6,
  },
  readingFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.separator,
    gap: 8,
  },
  readCountBadge: {
    fontSize: 12,
    fontWeight: "500",
  },
  autoRecordHint: {
    fontSize: 11,
    fontStyle: "italic",
  },
  readRegisteredBadge: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    gap: 10,
    borderCurve: "continuous",
  },
  readRegisteredText: {
    fontSize: 13,
    flex: 1,
  },
  actionSection: {
    marginBottom: 20,
  },
  runningControls: {
    gap: 12,
  },
  secondaryControlsRow: {
    flexDirection: "row",
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  settingsSection: {
    gap: 16,
  },
  groupContainer: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.6,
    marginLeft: 4,
  },
  card: {
    borderRadius: 16,
    overflow: "hidden",
    borderCurve: "continuous",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  settingContent: {
    flex: 1,
    gap: 2,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "500",
  },
  settingSubtitle: {
    fontSize: 13,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.separator,
    marginLeft: 52,
  },

  timePickerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 20,
  },
  pickerColumn: {
    alignItems: "center",
    gap: 6,
  },
  pickerLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  pickerValue: {
    fontSize: 28,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  colonSeparator: {
    fontSize: 32,
    fontWeight: "300",
    marginTop: 14,
  },
  iconSetting: {
    width: 26,
    height: 26,
  },
  dndNoticeCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    borderCurve: "continuous",
  },
  dndNoticeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  dndNoticeLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dndNoticeIcon: {
    width: 24,
    height: 24,
  },
  dndNoticeTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  dndNoticeSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
});
