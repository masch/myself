import { View, StyleSheet } from "react-native";
import { type CycleStatus } from "@myself/shared";
import { colors, spacing, radius } from "@/theme";
import { Badge, Card, ThemedText } from "@/components";

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
    <Card variant="subdued" padding="none" style={styles.container}>
      <View style={styles.headerRow}>
        <ThemedText
          variant="headline"
          color={colors.label}
          style={styles.stepText}
        >
          {isCompleted
            ? "¡Ciclo Completado!"
            : `Paso ${currentStep} de ${totalSteps}`}
        </ThemedText>
        <Badge
          variant={isCompleted ? "success" : "primary"}
          label={isCompleted ? "Completado" : `${percent}%`}
        />
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

      {/* Counter subtext */}
      <View style={styles.footerRow}>
        <ThemedText
          variant="caption1"
          color={colors.secondaryLabel}
          style={styles.statLabel}
        >
          ✓ {answeredCount} respondidas
        </ThemedText>
        {skippedCount > 0 && (
          <ThemedText
            variant="caption1"
            color={colors.systemOrange}
            style={styles.statLabel}
          >
            ↷ {skippedCount} salteadas
          </ThemedText>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.systemGray15,
    marginVertical: spacing.sm,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm + 2,
  },
  stepText: {
    fontWeight: "700",
  },
  track: {
    height: spacing.sm,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: spacing.sm,
  },
  fill: {
    height: "100%",
    borderRadius: 4,
  },
  footerRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  statLabel: {
    fontWeight: "500",
  },
});
