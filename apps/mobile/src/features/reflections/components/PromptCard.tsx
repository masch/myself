import { View, Text, StyleSheet, Pressable } from "react-native";
import { type ReflectionQuestion, type UserReflection } from "@myself/shared";
import { colors } from "@/theme/colors";
import { AppButton, AppMarkdownText } from "@/components";

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

  return (
    <View
      testID={cardTestId}
      style={[
        styles.card,
        {
          backgroundColor: colors.secondarySystemBackground,
          borderColor: isAnswered
            ? colors.systemGreen
            : isSkipped
              ? colors.systemOrange
              : colors.systemGray15,
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
            <Text style={[styles.typePillText, { color: colors.white }]}>
              {isScale ? "Escala 1-10" : "Texto libre"}
            </Text>
          </View>

          {question.preferredTimeOfDay && (
            <View
              style={[
                styles.timePill,
                {
                  backgroundColor: isLocked
                    ? "rgba(255, 149, 0, 0.15)"
                    : colors.systemGray15,
                },
              ]}
            >
              <Text
                style={[
                  styles.timePillText,
                  {
                    color: isLocked
                      ? colors.systemOrange
                      : colors.secondaryLabel,
                  },
                ]}
              >
                {isLocked ? "🔒" : "🕒"} {question.preferredTimeOfDay}
              </Text>
            </View>
          )}

          {dateLabel && (
            <View
              style={[
                styles.timePill,
                { backgroundColor: colors.systemGray15 },
              ]}
            >
              <Text
                style={[styles.timePillText, { color: colors.secondaryLabel }]}
              >
                {dateLabel}
              </Text>
            </View>
          )}
        </View>

        {/* Action icons (pin shortcut or opt-out) */}
        <View style={styles.topActions}>
          {onToggleShortcut && (
            <Pressable
              onPress={() => onToggleShortcut(!isPinnedShortcut)}
              style={styles.iconBtn}
              accessibilityRole="button"
              accessibilityLabel={
                isPinnedShortcut
                  ? "Desanclar acceso rápido"
                  : "Anclar acceso rápido"
              }
            >
              <Text style={styles.iconText}>
                {isPinnedShortcut ? "★" : "☆"}
              </Text>
            </Pressable>
          )}

          {isRoutine && onToggleOptOut && (
            <Pressable
              onPress={() => onToggleOptOut(!isRoutineEnabled)}
              style={[
                styles.optOutBtn,
                {
                  backgroundColor: isRoutineEnabled
                    ? colors.systemGray15
                    : colors.systemRed,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                isRoutineEnabled
                  ? "Desuscribir de rutina"
                  : "Suscribir a rutina"
              }
            >
              <Text
                style={[
                  styles.optOutBtnText,
                  {
                    color: isRoutineEnabled
                      ? colors.secondaryLabel
                      : colors.white,
                  },
                ]}
              >
                {isRoutineEnabled ? "Bajar" : "Reactivar"}
              </Text>
            </Pressable>
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
            <Text style={[styles.resultBadge, { color: colors.systemGreen }]}>
              ✓ Respondida
            </Text>
          )}
          {isScale ? (
            <Text style={[styles.resultContent, { color: colors.label }]}>
              Puntaje:{" "}
              <Text style={{ fontWeight: "700" }}>
                {reflection?.numericValue}/10
              </Text>
            </Text>
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
          <Text style={[styles.resultBadge, { color: colors.systemOrange }]}>
            ↷ Salteada
          </Text>
          <Text
            style={[styles.resultContent, { color: colors.secondaryLabel }]}
            numberOfLines={2}
          >
            {`Motivo: "${reflection?.skipReason}"`}
          </Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginVertical: 8,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  pillGroup: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  typePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  typePillText: {
    fontSize: 11,
    fontWeight: "600",
  },
  timePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  timePillText: {
    fontSize: 11,
    fontWeight: "500",
  },
  topActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconBtn: {
    padding: 4,
  },
  iconText: {
    fontSize: 20,
    color: colors.systemOrange,
  },
  optOutBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  optOutBtnText: {
    fontSize: 11,
    fontWeight: "600",
  },
  promptText: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 22,
    marginBottom: 12,
  },
  resultBox: {
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  resultBadge: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
  },
  resultContent: {
    fontSize: 13,
    fontStyle: "italic",
  },
  cardActions: {
    flexDirection: "row",
    gap: 10,
  },
});
