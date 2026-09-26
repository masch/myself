import { View, Text, StyleSheet } from "react-native";
import { type CycleStatus } from "@myself/shared";
import { colors } from "@/theme/colors";

interface CycleProgressBadgeProps {
  currentStep: number;
  totalSteps: number;
  answeredCount: number;
  skippedCount: number;
  status: CycleStatus;
}

export function CycleProgressBadge({
  currentStep,
  totalSteps,
  answeredCount,
  skippedCount,
  status,
}: CycleProgressBadgeProps) {
  const percent = Math.min(
    100,
    Math.round(((answeredCount + skippedCount) / totalSteps) * 100),
  );

  const isCompleted = status === "completed";

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.secondarySystemBackground },
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.stepText, { color: colors.label }]}>
          {isCompleted
            ? "¡Ciclo Completado!"
            : `Paso ${currentStep} de ${totalSteps}`}
        </Text>
        <View
          style={[
            styles.statusPill,
            {
              backgroundColor: isCompleted
                ? colors.systemGreen
                : colors.systemBlue,
            },
          ]}
        >
          <Text style={[styles.statusPillText, { color: colors.white }]}>
            {isCompleted ? "Completado" : `${percent}%`}
          </Text>
        </View>
      </View>

      {/* Progress track */}
      <View style={[styles.track, { backgroundColor: colors.systemGray15 }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${percent}%`,
              backgroundColor: isCompleted
                ? colors.systemGreen
                : colors.systemBlue,
            },
          ]}
        />
      </View>

      <View style={styles.statsRow}>
        <Text style={[styles.statLabel, { color: colors.secondaryLabel }]}>
          ✓ {answeredCount} respondidas
        </Text>
        {skippedCount > 0 && (
          <Text style={[styles.statLabel, { color: colors.systemOrange }]}>
            ↷ {skippedCount} salteadas
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 14,
    borderRadius: 16,
    marginVertical: 8,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  stepText: {
    fontSize: 16,
    fontWeight: "700",
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: "600",
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 8,
  },
  fill: {
    height: "100%",
    borderRadius: 3,
  },
  statsRow: {
    flexDirection: "row",
    gap: 14,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
});
