import { View, StyleSheet } from "react-native";
import { type ReflectionQuestion, type UserReflection } from "@myself/shared";
import { colors, spacing, radius } from "@/theme";
import {
  AppButton,
  AppMarkdownText,
  Card,
  ChipButton,
  IconButton,
  ThemedText,
} from "@/components";

interface PromptCardProps {
  question: ReflectionQuestion;
  reflection?: UserReflection | null;
  isPinnedShortcut?: boolean;
  isRoutine?: boolean;
  isRoutineEnabled?: boolean;
  isLocked?: boolean;
  dateLabel?: string;
  testID?: string;
  hideStatusBadge?: boolean;
  onAnswer: () => void;
  onSkip?: () => void;
  onToggleOptOut?: (enabled: boolean) => void;
  onToggleShortcut?: (pinned: boolean) => void;
}

export function PromptCard({
  question,
  reflection,
  isPinnedShortcut = false,
  isRoutine = false,
  isRoutineEnabled = true,
  isLocked = false,
  dateLabel,
  testID,
  hideStatusBadge = false,
  onAnswer,
  onSkip,
  onToggleOptOut,
  onToggleShortcut,
}: PromptCardProps) {
  const isAnswered = reflection?.status === "answered";
  const isSkipped = reflection?.status === "skipped";
  const isScale = question.responseType === "scale_1_10";

  const cardTestId =
    testID ||
    (dateLabel
      ? `prompt-card-missed-${question.id}`
      : `prompt-card-${question.id}`);

  const borderColor = isAnswered
    ? colors.systemGreen
    : isSkipped
      ? colors.systemOrange
      : colors.systemGray15;

  return (
    <Card
      testID={cardTestId}
      variant="subdued"
      padding="none"
      style={[
        styles.card,
        {
          borderColor,
          opacity: isLocked ? 0.72 : 1,
        },
      ]}
    >
      {/* Top Header */}
      <View style={styles.headerRow}>
        <View style={styles.pillGroup}>
          <View
            style={[
              styles.typePill,
              {
                backgroundColor: isScale
                  ? colors.systemPurple
                  : colors.systemBlue,
              },
            ]}
          >
            <ThemedText
              variant="caption2"
              color={colors.white}
              style={styles.typePillText}
            >
              {isScale ? "Escala 1-10" : "Texto libre"}
            </ThemedText>
          </View>

          {question.preferredTimeOfDay && (
            <View
              style={[
                styles.timePill,
                {
                  backgroundColor: isLocked
                    ? colors.warningSubdued
                    : colors.systemGray15,
                },
              ]}
            >
              <ThemedText
                variant="caption2"
                color={isLocked ? colors.systemOrange : colors.secondaryLabel}
                style={styles.timePillText}
              >
                {isLocked ? "🔒" : "🕒"} {question.preferredTimeOfDay}
              </ThemedText>
            </View>
          )}

          {dateLabel && (
            <View
              style={[
                styles.timePill,
                { backgroundColor: colors.systemGray15 },
              ]}
            >
              <ThemedText
                variant="caption2"
                color={colors.secondaryLabel}
                style={styles.timePillText}
              >
                {dateLabel}
              </ThemedText>
            </View>
          )}
        </View>

        {/* Action icons (pin shortcut or opt-out) */}
        <View style={styles.topActions}>
          {onToggleShortcut && (
            <IconButton
              icon={isPinnedShortcut ? "sf:star.fill" : "sf:star"}
              color={colors.systemOrange}
              size="small"
              accessibilityLabel={
                isPinnedShortcut
                  ? "Desanclar acceso rápido"
                  : "Anclar acceso rápido"
              }
              onPress={() => onToggleShortcut(!isPinnedShortcut)}
            />
          )}

          {isRoutine && onToggleOptOut && (
            <ChipButton
              title={isRoutineEnabled ? "Bajar" : "Reactivar"}
              variant={isRoutineEnabled ? "secondary" : "destructive"}
              accessibilityLabel={
                isRoutineEnabled
                  ? "Desuscribir de rutina"
                  : "Suscribir a rutina"
              }
              onPress={() => onToggleOptOut(!isRoutineEnabled)}
            />
          )}
        </View>
      </View>

      {/* Prompt Body */}
      <AppMarkdownText style={[styles.promptText, { color: colors.label }]}>
        {question.prompt}
      </AppMarkdownText>

      {/* Answered / Skipped Preview */}
      {isAnswered && (
        <View
          style={[
            styles.resultBox,
            { backgroundColor: colors.systemBackground },
          ]}
        >
          {!hideStatusBadge && (
            <ThemedText
              variant="caption1"
              color={colors.systemGreen}
              style={styles.resultBadge}
            >
              ✓ Respondida
            </ThemedText>
          )}
          {isScale ? (
            <ThemedText
              variant="caption1"
              color={colors.label}
              style={styles.resultContent}
            >
              Puntaje:{" "}
              <ThemedText variant="caption1" style={{ fontWeight: "700" }}>
                {reflection?.numericValue}/10
              </ThemedText>
            </ThemedText>
          ) : (
            <AppMarkdownText
              style={[styles.resultContent, { color: colors.secondaryLabel }]}
              numberOfLines={2}
            >
              {`"${reflection?.content}"`}
            </AppMarkdownText>
          )}
        </View>
      )}

      {isSkipped && (
        <View
          style={[
            styles.resultBox,
            { backgroundColor: colors.systemBackground },
          ]}
        >
          <ThemedText
            variant="caption1"
            color={colors.systemOrange}
            style={styles.resultBadge}
          >
            ↷ Salteada
          </ThemedText>
          <ThemedText
            variant="caption1"
            color={colors.secondaryLabel}
            style={styles.resultContent}
            numberOfLines={2}
          >
            {`Motivo: "${reflection?.skipReason}"`}
          </ThemedText>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.cardActions}>
        {isLocked ? (
          <View style={{ flex: 1 }}>
            <AppButton
              title={`Disponible a las ${question.preferredTimeOfDay}`}
              variant="gray"
              disabled={true}
              onPress={() => {}}
            />
          </View>
        ) : (
          <>
            <View style={{ flex: 1 }}>
              <AppButton
                title={
                  isAnswered
                    ? "Editar respuesta"
                    : isSkipped
                      ? "Completar ahora"
                      : "Responder"
                }
                variant="primary"
                onPress={onAnswer}
              />
            </View>

            {!isAnswered && onSkip && (
              <View style={{ flex: 1 }}>
                <AppButton
                  title="Saltear"
                  variant="secondary"
                  onPress={onSkip}
                />
              </View>
            )}
          </>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    borderRadius: radius.lg + 2, // 18px
    borderWidth: 1,
    marginVertical: spacing.sm,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm + 2,
  },
  pillGroup: {
    flexDirection: "row",
    gap: spacing.xs + 2,
    flexWrap: "wrap",
  },
  typePill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  typePillText: {
    fontWeight: "600",
  },
  timePill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  timePillText: {
    fontWeight: "500",
  },
  topActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  promptText: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 22,
    marginBottom: spacing.md - 4,
  },
  resultBox: {
    padding: spacing.sm + 2,
    borderRadius: radius.md - 2,
    marginBottom: spacing.md - 4,
  },
  resultBadge: {
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  resultContent: {
    fontStyle: "italic",
  },
  cardActions: {
    flexDirection: "row",
    gap: spacing.sm + 2,
  },
});
