import { View, StyleSheet } from "react-native";
import { type ThemeCohort, type ReflectionTheme } from "@myself/shared";
import { colors, layout, spacing, radius } from "@/theme";
import { AppButton, Badge, Card, ThemedText } from "@/components";
import {
  isCohortEnrollmentOpen,
  getCohortEnrollmentDeadline,
  formatDateDDMM,
} from "../domain/time-lock";

interface CohortEnrollmentCardProps {
  cohort: ThemeCohort;
  theme?: ReflectionTheme | null;
  isEnrolled?: boolean;
  onEnroll: () => void;
  isSubmitting?: boolean;
  currentDateStr?: string;
}

export function CohortEnrollmentCard({
  cohort,
  theme,
  isEnrolled = false,
  onEnroll,
  isSubmitting = false,
  currentDateStr,
}: CohortEnrollmentCardProps) {
  const isOpen = isCohortEnrollmentOpen(cohort, currentDateStr);
  const deadline = getCohortEnrollmentDeadline(cohort);

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

        {!isOpen && !isEnrolled && (
          <Badge variant="neutral" label="Inscripción cerrada" />
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
        {cohort.enrollmentGraceDays > 0 ? (
          <ThemedText
            variant="caption1"
            color={colors.secondaryLabel}
            style={styles.detailItem}
          >
            ⏳ Plazo de gracia para sumarte:{" "}
            <ThemedText variant="caption1" color={colors.label}>
              {cohort.enrollmentGraceDays}{" "}
              {cohort.enrollmentGraceDays === 1 ? "día" : "días"}
            </ThemedText>
          </ThemedText>
        ) : null}
        <ThemedText
          variant="caption1"
          color={colors.secondaryLabel}
          style={styles.detailItem}
        >
          ⏰ Límite de inscripción:{" "}
          <ThemedText variant="caption1" color={colors.label}>
            {formatDateDDMM(deadline)}
          </ThemedText>
        </ThemedText>
      </View>

      <AppButton
        title={
          isEnrolled
            ? "Inscripto ✓"
            : !isOpen
              ? "Inscripción cerrada"
              : isSubmitting
                ? "Inscribiendo..."
                : "Sumarme a la convocatoria"
        }
        variant={isEnrolled ? "secondary" : !isOpen ? "secondary" : "purple"}
        onPress={onEnroll}
        disabled={isEnrolled || isSubmitting || !isOpen}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: layout.cardPadding,
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
