import { useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { type ReflectionQuestion, type UserReflection } from "@myself/shared";
import { colors, layout, spacing, radius } from "@/theme";
import {
  AppButton,
  AppMarkdownText,
  Badge,
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
  const [isExpanded, setIsExpanded] = useState(false);
  const isAnswered = reflection?.status === "answered";
  const isSkipped = reflection?.status === "skipped";
  const isScale = question.responseType === "scale_1_10";
  const isItemList = question.responseType === "item_list";

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
                  : isItemList
                    ? colors.systemGreen
                    : colors.systemBlue,
              },
            ]}
          >
            <ThemedText
              variant="caption2"
              color={colors.white}
              style={styles.typePillText}
            >
              {isScale
                ? "Escala 1-10"
                : isItemList
                  ? "Lista de momentos"
                  : "Texto libre"}
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
            <Badge
              variant="success"
              size="sm"
              label="✓ Respondida"
              style={{ marginBottom: spacing.xs }}
            />
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
          ) : isItemList ? (
            <View style={styles.itemListPreviewContainer}>
              <View style={styles.itemListHeaderRow}>
                <ThemedText
                  variant="caption1"
                  color={colors.label}
                  style={{ fontWeight: "600" }}
                >
                  {`${reflection?.items?.length ?? 0} momento${(reflection?.items?.length ?? 0) === 1 ? "" : "s"} anotado${(reflection?.items?.length ?? 0) === 1 ? "" : "s"}`}
                </ThemedText>
                {(reflection?.items?.length ?? 0) > 0 && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      isExpanded ? "Ocultar momentos" : "Ver lista de momentos"
                    }
                    onPress={() => setIsExpanded(!isExpanded)}
                    hitSlop={8}
                  >
                    <ThemedText variant="caption2" color={colors.systemBlue}>
                      {isExpanded ? "Ocultar" : "Ver lista"}
                    </ThemedText>
                  </Pressable>
                )}
              </View>

              {isExpanded &&
                reflection?.items &&
                reflection.items.length > 0 && (
                  <View style={styles.expandedItemList}>
                    {reflection.items.map((item, idx) => (
                      <View key={item.id ?? idx} style={styles.itemBulletRow}>
                        <ThemedText
                          variant="caption2"
                          color={colors.secondaryLabel}
                          style={{ width: 16 }}
                        >
                          {`${idx + 1}.`}
                        </ThemedText>
                        <ThemedText
                          variant="caption1"
                          color={colors.label}
                          style={{ flex: 1 }}
                        >
                          {item.content}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                )}
            </View>
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
          <Badge
            variant="warning"
            size="sm"
            label="↷ Salteada"
            style={{ marginBottom: spacing.xs }}
          />
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
    padding: layout.cardPadding,
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
  resultContent: {
    fontStyle: "italic",
  },
  itemListPreviewContainer: {
    gap: spacing.xs,
  },
  itemListHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  expandedItemList: {
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.separator,
    gap: spacing.xs,
  },
  itemBulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xs,
  },
  cardActions: {
    flexDirection: "row",
    gap: spacing.sm + 2,
  },
});
