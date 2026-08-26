import { useState, useEffect, useRef } from "react";
import { View, StyleSheet, ScrollView, Text, Switch } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useKeepAwake } from "expo-keep-awake";
import { isDndActive, isDndCheckSupported } from "@/modules/dnd-status";
import { useMeditation } from "@/hooks/use-meditation";
import { useReadings } from "@/hooks/use-readings";
import { AppButton, ChipButton, StepperButton } from "@/components";
import { colors } from "@/theme/colors";

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
  const insets = useSafeAreaInsets();
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

  const handleResetSession = () => {
    recordedSessionReadingIdRef.current = null;
    setShowDndNotice(false);
    resetSession();
  };

  const handleStartSession = () => {
    recordedSessionReadingIdRef.current = null;
    startSession();
    if (isDndCheckSupported()) {
      // In Android: only show notice if DND is NOT active
      const dnd = isDndActive();
      setShowDndNotice(!dnd);
    } else {
      // On iOS/Web: show reminder tip
      setShowDndNotice(true);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.systemBackground }]}
      contentContainerStyle={[
        styles.contentContainer,
        {
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 48,
        },
      ]}
      contentInsetAdjustmentBehavior="automatic"
    >
      {/* Main Timer Display Card */}
      <View
        style={[
          styles.timerCard,
          { backgroundColor: colors.secondarySystemBackground },
        ]}
      >
        <Text style={[styles.statusBadge, { color: colors.secondaryLabel }]}>
          {isIdle && "LISTO PARA COMENZAR"}
          {isRunning && "EN MEDITACIÓN"}
          {isPaused && "EN PAUSA"}
          {isCompleted && "SESIÓN COMPLETADA"}
        </Text>

        <Text style={[styles.timerText, { color: colors.label }]}>
          {formatTime(elapsedSeconds)}
        </Text>

        {/* Current Phase Indicator */}
        {!isIdle && !isCompleted && (
          <View style={styles.momentContainer}>
            <Text style={[styles.momentStep, { color: colors.systemBlue }]}>
              Momento {currentMomentIndex + 1} de {moments.length}
            </Text>
            <Text style={[styles.momentTitle, { color: colors.label }]}>
              {currentMoment}
            </Text>
            {isWaitingForScheduledTime && (
              <Text
                style={[
                  styles.scheduledNotice,
                  { color: colors.secondaryLabel },
                ]}
              >
                🔔 Avanzará al Momento 3 al llegar a las{" "}
                {formatClock(targetHour, targetMinute)} hs
              </Text>
            )}
          </View>
        )}

        {isCompleted && (
          <View style={styles.momentContainer}>
            <Text style={[styles.momentTitle, { color: colors.label }]}>
              ¡Meditación Finalizada!
            </Text>
            <Text
              style={[styles.momentSubtitle, { color: colors.secondaryLabel }]}
            >
              Completaste los 3 momentos de la práctica.
            </Text>
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
      </View>

      {/* DND Reminder Notice on Moment 1 if inactive or on iOS */}
      {showDndNotice && (isRunning || isPaused) && currentMomentIndex === 0 && (
        <View
          style={[
            styles.dndNoticeCard,
            {
              backgroundColor: colors.secondarySystemBackground,
              borderColor: colors.systemPurple,
            },
          ]}
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
                <Text
                  style={[styles.dndNoticeTitle, { color: colors.label }]}
                >
                  {isDndCheckSupported()
                    ? "Modo No Molestar desactivado"
                    : "Sugerencia: activá No Molestar"}
                </Text>
                <Text
                  style={[
                    styles.dndNoticeSubtitle,
                    { color: colors.secondaryLabel },
                  ]}
                >
                  {isDndCheckSupported()
                    ? "Detectamos que las notificaciones están activas. Te sugerimos poner el teléfono en No Molestar para meditar sin interrupciones."
                    : "Poné tu teléfono en modo Enfoque / No Molestar para meditar sin interrupciones."}
                </Text>
              </View>
            </View>
            <ChipButton
              title="Entendido"
              variant="purple"
              onPress={() => setShowDndNotice(false)}
            />
          </View>
        </View>
      )}

      {/* Reading Card: Selected before starting OR during Moment 1 */}
      {(isIdle || (!isCompleted && currentMomentIndex === 0)) && (
        <View
          style={[
            styles.readingStepCard,
            {
              backgroundColor: colors.secondarySystemBackground,
              borderLeftColor: colors.systemPurple,
            },
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
                    <Text
                      style={[
                        styles.readingCardTag,
                        { color: colors.systemPurple },
                      ]}
                    >
                      {isIdle
                        ? "LECTURA SELECCIONADA PARA LA SESIÓN"
                        : "MOMENTO 1: LECTURA Y REFLEXIÓN"}
                    </Text>
                    <Text
                      style={[
                        styles.readingAuthorName,
                        { color: colors.label },
                      ]}
                    >
                      {activeReading.author_name}
                    </Text>
                    {activeReading.author_bio ? (
                      <Text
                        style={[
                          styles.readingAuthorBio,
                          { color: colors.secondaryLabel },
                        ]}
                      >
                        {activeReading.author_bio}
                      </Text>
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
                <Text
                  style={[styles.quoteSign, { color: colors.systemPurple }]}
                >
                  “
                </Text>
                <Text style={[styles.reflectionText, { color: colors.label }]}>
                  {activeReading.content}
                </Text>
              </View>

              <View style={styles.readingFooter}>
                <Text
                  style={[
                    styles.readCountBadge,
                    { color: colors.secondaryLabel },
                  ]}
                >
                  {activeReading.times_read === 0
                    ? "✨ Texto nuevo (sin leer)"
                    : `📖 Leído ${activeReading.times_read} ${activeReading.times_read === 1 ? "vez" : "veces"}`}
                </Text>

                <Text
                  style={[
                    styles.autoRecordHint,
                    { color: colors.secondaryLabel },
                  ]}
                >
                  {isIdle
                    ? "Se marcará como leído al pasar al Momento 2"
                    : "Pasa al Momento 2 para registrarla como leída"}
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.emptyReadingBox}>
              <Image
                source="sf:book.closed"
                style={[
                  styles.emptyReadingIcon,
                  { tintColor: colors.systemPurple },
                ]}
              />
              <Text style={[styles.emptyReadingTitle, { color: colors.label }]}>
                Sin textos en la biblioteca
              </Text>
              <Text
                style={[
                  styles.emptyReadingSubtitle,
                  { color: colors.secondaryLabel },
                ]}
              >
                Podés crear nuevas lecturas en la pestaña &apos;Lecturas&apos;.
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Moment 2 & 3: Badge confirming read has been registered */}
      {!isIdle && !isCompleted && currentMomentIndex >= 1 && activeReading && (
        <View
          style={[
            styles.readRegisteredBadge,
            { backgroundColor: colors.secondarySystemBackground },
          ]}
        >
          <Image
            source="sf:checkmark.circle.fill"
            style={[styles.checkIcon, { tintColor: colors.systemGreen }]}
          />
          <Text style={[styles.readRegisteredText, { color: colors.label }]}>
            Lectura de{" "}
            <Text style={{ fontWeight: "600" }}>
              {activeReading.author_name}
            </Text>{" "}
            registrada como leída en esta sesión.
          </Text>
        </View>
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
          <Text style={[styles.sectionTitle, { color: colors.secondaryLabel }]}>
            CONFIGURACIÓN DE ALARMA Y SONIDOS
          </Text>

          <View
            style={[
              styles.card,
              { backgroundColor: colors.secondarySystemBackground },
            ]}
          >
            {/* Alarm Active Switch */}
            <View style={styles.settingRow}>
              <Image
                source="sf:bell.fill"
                style={[styles.iconSetting, { tintColor: colors.systemOrange }]}
              />
              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, { color: colors.label }]}>
                  Alarma de Pared Programada
                </Text>
                <Text
                  style={[
                    styles.settingSubtitle,
                    { color: colors.secondaryLabel },
                  ]}
                >
                  Suena 1 gong al llegar a la hora objetivo
                </Text>
              </View>
              <Switch
                value={alarmEnabled}
                onValueChange={setAlarmEnabled}
                trackColor={{
                  false: "rgba(142, 142, 147, 0.3)",
                  true: colors.systemGreen as any,
                }}
              />
            </View>

            <View style={styles.divider} />

            {/* Target Time Setting Row */}
            <View style={styles.settingRow}>
              <Image
                source="sf:clock.fill"
                style={[styles.iconSetting, { tintColor: colors.systemBlue }]}
              />
              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, { color: colors.label }]}>
                  Hora Objetivo
                </Text>
                <Text
                  style={[
                    styles.settingSubtitle,
                    { color: colors.secondaryLabel },
                  ]}
                >
                  {formatClock(targetHour, targetMinute)} hs
                </Text>
              </View>
              <ChipButton
                title={isConfigOpen ? "Cerrar" : "Editar"}
                variant="blue"
                onPress={() => setIsConfigOpen((prev) => !prev)}
              />
            </View>

            {/* Stepper Inline Time Picker */}
            {isConfigOpen && (
              <>
                <View style={styles.divider} />
                <View style={styles.timePickerContainer}>
                  {/* Hours column */}
                  <View style={styles.pickerColumn}>
                    <Text
                      style={[
                        styles.pickerLabel,
                        { color: colors.secondaryLabel },
                      ]}
                    >
                      HORA
                    </Text>
                    <StepperButton direction="up" onPress={incrementHour} />
                    <Text style={[styles.pickerValue, { color: colors.label }]}>
                      {targetHour.toString().padStart(2, "0")}
                    </Text>
                    <StepperButton direction="down" onPress={decrementHour} />
                  </View>

                  <Text
                    style={[styles.colonSeparator, { color: colors.label }]}
                  >
                    :
                  </Text>

                  {/* Minutes column */}
                  <View style={styles.pickerColumn}>
                    <Text
                      style={[
                        styles.pickerLabel,
                        { color: colors.secondaryLabel },
                      ]}
                    >
                      MINUTO
                    </Text>
                    <StepperButton direction="up" onPress={incrementMinute} />
                    <Text style={[styles.pickerValue, { color: colors.label }]}>
                      {targetMinute.toString().padStart(2, "0")}
                    </Text>
                    <StepperButton direction="down" onPress={decrementMinute} />
                  </View>
                </View>
              </>
            )}

            <View style={styles.divider} />

            {/* Test Single Gong */}
            <View style={styles.settingRow}>
              <Image
                source="sf:speaker.wave.2.fill"
                style={[styles.iconSetting, { tintColor: colors.systemPurple }]}
              />
              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, { color: colors.label }]}>
                  Probar Gong Simple
                </Text>
                <Text
                  style={[
                    styles.settingSubtitle,
                    { color: colors.secondaryLabel },
                  ]}
                >
                  Sonido de inicio y cambio de fase
                </Text>
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
                <Text style={[styles.settingTitle, { color: colors.label }]}>
                  Probar Triple Gong
                </Text>
                <Text
                  style={[
                    styles.settingSubtitle,
                    { color: colors.secondaryLabel },
                  ]}
                >
                  Sonido de cierre de meditación
                </Text>
              </View>
              <ChipButton
                title="3 Gongs"
                variant="success"
                onPress={playTripleGong}
              />
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },
  timerCard: {
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    borderCurve: "continuous",
    boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.08)",
    elevation: 3,
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: 8,
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
  },
  quoteSign: {
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 22,
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
    borderTopColor: "rgba(142, 142, 147, 0.2)",
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
  checkIcon: {
    width: 20,
    height: 20,
  },
  readRegisteredText: {
    fontSize: 13,
    flex: 1,
  },
  emptyReadingBox: {
    alignItems: "center",
    paddingVertical: 14,
    gap: 6,
  },
  emptyReadingIcon: {
    width: 32,
    height: 32,
  },
  emptyReadingTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  emptyReadingSubtitle: {
    fontSize: 13,
    textAlign: "center",
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
    backgroundColor: "rgba(142, 142, 147, 0.2)",
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
