import { View, Text, StyleSheet } from "react-native";
import { type ThemeCohort, type ReflectionTheme } from "@myself/shared";
import { colors } from "@/theme/colors";
import { AppButton } from "@/components";

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
    <View
      style={[
        styles.card,
        { backgroundColor: colors.secondarySystemBackground },
      ]}
    >
      <View style={styles.topRow}>
        <View style={[styles.badge, { backgroundColor: colors.systemPurple }]}>
          <Text style={[styles.badgeText, { color: colors.white }]}>
            Programa Temático
          </Text>
        </View>

        {theme && (
          <View
            style={[styles.badge, { backgroundColor: colors.systemGray15 }]}
          >
            <Text style={[styles.badgeText, { color: colors.secondaryLabel }]}>
              {theme.targetQuestionCount} días
            </Text>
          </View>
        )}
      </View>

      <Text style={[styles.title, { color: colors.label }]}>
        {theme?.title ?? cohort.name}
      </Text>

      {theme?.description ? (
        <Text style={[styles.description, { color: colors.secondaryLabel }]}>
          {theme.description}
        </Text>
      ) : null}

      <View style={styles.detailsBox}>
        <Text style={[styles.detailItem, { color: colors.secondaryLabel }]}>
          📅 Convocatoria:{" "}
          <Text style={{ color: colors.label }}>{cohort.name}</Text>
        </Text>
        <Text style={[styles.detailItem, { color: colors.secondaryLabel }]}>
          🏁 Comienza:{" "}
          <Text style={{ color: colors.label }}>{cohort.programStartDate}</Text>
        </Text>
        <Text style={[styles.detailItem, { color: colors.secondaryLabel }]}>
          ⏳ Ventana de gracia:{" "}
          <Text style={{ color: colors.label }}>
            {theme?.catchUpWindowDays ?? 2} días
          </Text>
        </Text>
      </View>

      <View style={styles.actionRow}>
        <AppButton
          title={
            isSubmitting
              ? "Inscribiendo..."
              : isEnrolled
                ? "Inscripto ✓"
                : "Sumarme a la convocatoria"
          }
          variant={isEnrolled ? "secondary" : "primary"}
          onPress={onEnroll}
          disabled={isEnrolled || isSubmitting}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 18,
    borderRadius: 20,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: colors.systemGray15,
  },
  topRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  detailsBox: {
    gap: 4,
    marginBottom: 16,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.systemGray15,
  },
  detailItem: {
    fontSize: 13,
  },
  actionRow: {
    marginTop: 4,
  },
});
