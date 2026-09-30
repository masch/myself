import { View, StyleSheet } from "react-native";
import { type ThemeCohort, type ReflectionTheme } from "@myself/shared";
import { colors, spacing, radius } from "@/theme";
import { AppButton, Badge, Card, ThemedText } from "@/components";

interface CohortEnrollmentCardProps {
  cohort: ThemeCohort;
  theme?: ReflectionTheme | null;
  isEnrolled?: boolean;
  onEnroll: () => void;
  isSubmitting?: boolean;
}

export function CohortEnrollmentCard({
  cohort,
  theme,
  isEnrolled = false,
  onEnroll,
  isSubmitting = false,
}: CohortEnrollmentCardProps) {
  return (
    <Card variant="subdued" padding="none" style={styles.card}>
      <View style={styles.topRow}>
        <Badge variant="purple" label="Programa Temático" />

        {theme && (
          <Badge
            variant="neutral"
            label={`${theme.targetQuestionCount} días`}
          />
        )}
      </View>

      <ThemedText variant="headline" color={colors.label} style={styles.title}>
        {theme?.title ?? cohort.name}
      </ThemedText>

      {theme?.description ? (
        <ThemedText
          variant="callout"
          color={colors.secondaryLabel}
          style={styles.description}
        >
          {theme.description}
        </ThemedText>
      ) : null}

      <View style={styles.detailsBox}>
        <ThemedText
          variant="caption1"
          color={colors.secondaryLabel}
          style={styles.detailItem}
        >
          📅 Convocatoria:{" "}
          <ThemedText variant="caption1" color={colors.label}>
            {cohort.name}
          </ThemedText>
        </ThemedText>
        <ThemedText
          variant="caption1"
          color={colors.secondaryLabel}
          style={styles.detailItem}
        >
          🏁 Comienza:{" "}
          <ThemedText variant="caption1" color={colors.label}>
            {cohort.programStartDate}
          </ThemedText>
        </ThemedText>
        <ThemedText
          variant="caption1"
          color={colors.secondaryLabel}
          style={styles.detailItem}
        >
          ⏳ Ventana de gracia:{" "}
          <ThemedText variant="caption1" color={colors.label}>
            {theme?.catchUpWindowDays ?? 2} días
          </ThemedText>
        </ThemedText>
      </View>

      <AppButton
        title={
          isEnrolled
            ? "Inscripto ✓"
            : isSubmitting
              ? "Inscribiendo..."
              : "Sumarme a la convocatoria"
        }
        variant={isEnrolled ? "secondary" : "purple"}
        onPress={onEnroll}
        disabled={isEnrolled || isSubmitting}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    borderRadius: radius.lg + 2, // 18px
    borderWidth: 1,
    borderColor: colors.systemGray15,
    marginVertical: spacing.sm,
  },
  topRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.sm + 2,
  },
  title: {
    fontWeight: "700",
    marginBottom: spacing.xs + 2,
  },
  description: {
    marginBottom: spacing.md,
  },
  detailsBox: {
    backgroundColor: colors.systemBackground,
    padding: spacing.sm + 2,
    borderRadius: radius.md - 2,
    gap: spacing.xs + 2,
    marginBottom: spacing.md,
  },
  detailItem: {
    lineHeight: 18,
  },
});
