import { useState } from "react";
import { View, StyleSheet, ScrollView, Text, Pressable } from "react-native";
import { Image } from "expo-image";
import { Host, Switch, Button } from "@expo/ui";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMeditation } from "@/hooks/use-meditation";
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
    hasAlarmTriggered,
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

  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const incrementHour = () => setTargetHour((prev) => (prev + 1) % 24);
  const decrementHour = () => setTargetHour((prev) => (prev - 1 + 24) % 24);
  const incrementMinute = () => setTargetMinute((prev) => (prev + 1) % 60);
  const decrementMinute = () => setTargetMinute((prev) => (prev - 1 + 60) % 60);

  const isRunning = status === "running";
  const isPaused = status === "paused";
  const isCompleted = status === "completed";
  const isIdle = status === "idle";

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

      {/* Primary Actions */}
      <View style={styles.actionSection}>
        {isIdle && (
          <Pressable
            style={[
              styles.primaryButton,
              { backgroundColor: colors.systemBlue },
            ]}
            onPress={startSession}
          >
            <Text style={styles.primaryButtonText}>Iniciar Meditación</Text>
            <Text style={styles.primaryButtonSubtext}>
              Suena 1 gong y comienza el Momento 1
            </Text>
          </Pressable>
        )}

        {(isRunning || isPaused) && (
          <View style={styles.runningControls}>
            {/* Context-aware Next/Finish Button */}
            {currentMomentIndex === 0 && (
              <Pressable
                style={[
                  styles.primaryButton,
                  { backgroundColor: colors.systemBlue },
                ]}
                onPress={nextMoment}
              >
                <Text style={styles.primaryButtonText}>Siguiente Momento</Text>
                <Text style={styles.primaryButtonSubtext}>
                  Suena 1 gong y pasa al Momento 2
                </Text>
              </Pressable>
            )}

            {currentMomentIndex === 1 && (
              <Pressable
                style={[styles.primaryButton, { backgroundColor: "#6C757D" }]}
                onPress={nextMoment}
              >
                <Text style={styles.primaryButtonText}>
                  Avanzar a Momento 3 (Manual)
                </Text>
                <Text style={styles.primaryButtonSubtext}>
                  O esperar a las {formatClock(targetHour, targetMinute)} para
                  pase automático con 1 gong
                </Text>
              </Pressable>
            )}

            {currentMomentIndex === 2 && (
              <Pressable
                style={[styles.primaryButton, { backgroundColor: "#34C759" }]}
                onPress={nextMoment}
              >
                <Text style={styles.primaryButtonText}>
                  Finalizar Meditación (3 Gongs)
                </Text>
                <Text style={styles.primaryButtonSubtext}>
                  Suena triple gong de cierre
                </Text>
              </Pressable>
            )}

            <View style={styles.secondaryControlsRow}>
              <Pressable
                style={[
                  styles.secondaryButton,
                  { backgroundColor: colors.secondarySystemBackground },
                ]}
                onPress={isRunning ? pauseSession : resumeSession}
              >
                <Text
                  style={[styles.secondaryButtonText, { color: colors.label }]}
                >
                  {isRunning ? "Pausar" : "Reanudar"}
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.secondaryButton,
                  { backgroundColor: colors.secondarySystemBackground },
                ]}
                onPress={resetSession}
              >
                <Text
                  style={[styles.secondaryButtonText, { color: "#FF3B30" }]}
                >
                  Reiniciar
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {isCompleted && (
          <Pressable
            style={[
              styles.primaryButton,
              { backgroundColor: colors.systemBlue },
            ]}
            onPress={resetSession}
          >
            <Text style={styles.primaryButtonText}>Nueva Meditación</Text>
          </Pressable>
        )}
      </View>

      {/* Scheduled Clock Alarm Settings & Sound test */}
      <View style={styles.settingsSection}>
        <View style={styles.groupContainer}>
          <Text style={[styles.sectionTitle, { color: colors.secondaryLabel }]}>
            PASO AUTOMÁTICO POR HORA (MOMENTO 2 → 3)
          </Text>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.secondarySystemBackground },
            ]}
          >
            <View style={styles.settingRow}>
              <Image source="sf:bell.fill" style={styles.iconGold} />
              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, { color: colors.label }]}>
                  Transición a hora exacta
                </Text>
                <Text
                  style={[
                    styles.settingSubtitle,
                    { color: colors.secondaryLabel },
                  ]}
                >
                  {alarmEnabled
                    ? `Avanza y suena 1 gong a las ${formatClock(targetHour, targetMinute)} hs${hasAlarmTriggered ? " • Disparado hoy" : ""}`
                    : "Desactivado (requerirá paso manual)"}
                </Text>
              </View>
              <Host matchContents>
                <Switch
                  value={alarmEnabled}
                  onValueChange={(val) => setAlarmEnabled(val)}
                />
              </Host>
            </View>

            {alarmEnabled && (
              <>
                <View style={styles.divider} />
                <View style={styles.settingRow}>
                  <Image source="sf:clock.fill" style={styles.iconBlue} />
                  <View style={styles.settingContent}>
                    <Text
                      style={[styles.settingTitle, { color: colors.label }]}
                    >
                      Hora programada
                    </Text>
                  </View>
                  <Pressable
                    style={styles.timeBadge}
                    onPress={() => setIsConfigOpen((prev) => !prev)}
                  >
                    <Text
                      style={[
                        styles.timeBadgeText,
                        { color: colors.systemBlue },
                      ]}
                    >
                      {formatClock(targetHour, targetMinute)}{" "}
                      {isConfigOpen ? "▲" : "▼"}
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>

        {alarmEnabled && isConfigOpen && (
          <View style={styles.groupContainer}>
            <Text
              style={[styles.sectionTitle, { color: colors.secondaryLabel }]}
            >
              AJUSTAR HORA Y MINUTOS
            </Text>
            <View
              style={[
                styles.card,
                styles.timePickerContainer,
                { backgroundColor: colors.secondarySystemBackground },
              ]}
            >
              {/* Hour control */}
              <View style={styles.pickerColumn}>
                <Text
                  style={[styles.pickerLabel, { color: colors.secondaryLabel }]}
                >
                  HORA
                </Text>
                <Pressable
                  style={[
                    styles.stepperButton,
                    { borderColor: colors.secondaryLabel },
                  ]}
                  onPress={incrementHour}
                >
                  <Text
                    style={[styles.stepperButtonText, { color: colors.label }]}
                  >
                    +
                  </Text>
                </Pressable>
                <Text style={[styles.pickerValue, { color: colors.label }]}>
                  {targetHour.toString().padStart(2, "0")}
                </Text>
                <Pressable
                  style={[
                    styles.stepperButton,
                    { borderColor: colors.secondaryLabel },
                  ]}
                  onPress={decrementHour}
                >
                  <Text
                    style={[styles.stepperButtonText, { color: colors.label }]}
                  >
                    -
                  </Text>
                </Pressable>
              </View>

              <Text style={[styles.colonSeparator, { color: colors.label }]}>
                :
              </Text>

              {/* Minute control */}
              <View style={styles.pickerColumn}>
                <Text
                  style={[styles.pickerLabel, { color: colors.secondaryLabel }]}
                >
                  MINUTOS
                </Text>
                <Pressable
                  style={[
                    styles.stepperButton,
                    { borderColor: colors.secondaryLabel },
                  ]}
                  onPress={incrementMinute}
                >
                  <Text
                    style={[styles.stepperButtonText, { color: colors.label }]}
                  >
                    +
                  </Text>
                </Pressable>
                <Text style={[styles.pickerValue, { color: colors.label }]}>
                  {targetMinute.toString().padStart(2, "0")}
                </Text>
                <Pressable
                  style={[
                    styles.stepperButton,
                    { borderColor: colors.secondaryLabel },
                  ]}
                  onPress={decrementMinute}
                >
                  <Text
                    style={[styles.stepperButtonText, { color: colors.label }]}
                  >
                    -
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}

        <View style={styles.groupContainer}>
          <Text style={[styles.sectionTitle, { color: colors.secondaryLabel }]}>
            PRUEBA DE SONIDO
          </Text>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.secondarySystemBackground },
            ]}
          >
            <View style={styles.settingRow}>
              <Image source="sf:speaker.wave.2.fill" style={styles.iconGreen} />
              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, { color: colors.label }]}>
                  Gong Simple (1 toque)
                </Text>
                <Text
                  style={[
                    styles.settingSubtitle,
                    { color: colors.secondaryLabel },
                  ]}
                >
                  Inicio, siguiente y alarma horaria
                </Text>
              </View>
              <Host matchContents>
                <Button label="Probar" onPress={() => playSingleGong()} />
              </Host>
            </View>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <Image
                source="sf:speaker.wave.3.fill"
                style={styles.iconPurple}
              />
              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, { color: colors.label }]}>
                  Gong Triple (3 toques)
                </Text>
                <Text
                  style={[
                    styles.settingSubtitle,
                    { color: colors.secondaryLabel },
                  ]}
                >
                  Finalización de sesión
                </Text>
              </View>
              <Host matchContents>
                <Button label="Probar" onPress={() => playTripleGong()} />
              </Host>
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
    padding: 16,
    paddingBottom: 48,
  },
  timerCard: {
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
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
  actionSection: {
    marginBottom: 20,
  },
  primaryButton: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
  primaryButtonSubtext: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 12,
    marginTop: 4,
  },
  runningControls: {
    gap: 12,
  },
  secondaryControlsRow: {
    flexDirection: "row",
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
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
  soundTestButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  soundTestText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  timeBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  timeBadgeText: {
    fontSize: 16,
    fontWeight: "600",
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
  stepperButton: {
    width: 36,
    height: 28,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  colonSeparator: {
    fontSize: 32,
    fontWeight: "300",
    marginTop: 14,
  },
  iconBlue: {
    width: 26,
    height: 26,
    tintColor: "#007AFF",
  },
  iconGreen: {
    width: 26,
    height: 26,
    tintColor: "#34C759",
  },
  iconPurple: {
    width: 26,
    height: 26,
    tintColor: "#AF52DE",
  },
  iconGold: {
    width: 26,
    height: 26,
    tintColor: "#FF9500",
  },
});
