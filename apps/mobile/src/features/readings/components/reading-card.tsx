import React from "react";
import { View, StyleSheet, Text } from "react-native";
import { IconButton, ChipButton, MeditationText, AppIcon } from "@/components";
import { colors } from "@/theme/colors";
import { type MeditationReadingWithAuthor } from "@/db/database";

export interface ReadingCardProps {
  reading: MeditationReadingWithAuthor;
  onEdit: (reading: MeditationReadingWithAuthor) => void;
  onDelete: (reading: MeditationReadingWithAuthor) => void;
  onRecordRead: (readingId: string) => void;
  onUndoRead?: (readingId: string) => void;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export function ReadingCard({
  reading,
  onEdit,
  onDelete,
  onRecordRead,
  onUndoRead,
}: ReadingCardProps) {
  const isCompleted = reading.times_read > 0;

  return (
    <View
      style={[
        styles.card,
        isCompleted && styles.cardCompleted,
        { backgroundColor: colors.secondarySystemBackground },
      ]}
    >
      {/* Card Header: Author info & Action buttons */}
      <View style={styles.cardHeader}>
        <View style={styles.authorBadgeContainer}>
          <AppIcon
            name={
              isCompleted ? "sf:checkmark.seal.fill" : "sf:person.circle.fill"
            }
            size={32}
            color={isCompleted ? colors.systemGreen : colors.systemPurple}
          />
          <View>
            <Text style={[styles.authorNameText, { color: colors.label }]}>
              {reading.author_name}
            </Text>
            {reading.author_bio ? (
              <Text
                style={[styles.authorBioText, { color: colors.secondaryLabel }]}
              >
                {reading.author_bio}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.cardActionsRow}>
          <IconButton
            icon="sf:pencil"
            color={colors.systemBlue}
            size="medium"
            accessibilityLabel={`Edit reading ${reading.title || reading.id}`}
            onPress={() => onEdit(reading)}
          />
          <IconButton
            icon="sf:trash"
            color={colors.systemRed}
            size="medium"
            accessibilityLabel={`Delete reading ${reading.title || reading.id}`}
            onPress={() => onDelete(reading)}
          />
        </View>
      </View>

      {/* Quote Content */}
      <View style={styles.quoteWrapper}>
        {Boolean(reading.title) && (
          <Text
            style={[
              styles.readingCardTitle,
              {
                color: isCompleted
                  ? colors.secondaryLabel
                  : colors.systemPurple,
              },
            ]}
          >
            {reading.title}
          </Text>
        )}
        <MeditationText
          content={reading.content}
          baseFontSize={15}
          baseLineHeight={22}
          textColor={isCompleted ? colors.secondaryLabel : colors.label}
          accentColor={colors.systemPurple}
        />
      </View>

      {/* Card Footer: Timestamps & Read Actions */}
      <View style={styles.cardFooter}>
        <View style={styles.timestampContainer}>
          <Text
            style={[styles.timestampText, { color: colors.secondaryLabel }]}
          >
            Added: {formatDate(reading.created_at)}
          </Text>
          {isCompleted && (
            <Text
              style={[styles.timestampTextRead, { color: colors.systemGreen }]}
            >
              Read {reading.times_read}{" "}
              {reading.times_read === 1 ? "time" : "times"} • Last:{" "}
              {formatDate(reading.last_read_at)}
            </Text>
          )}
        </View>

        {isCompleted ? (
          <View style={styles.cardFooterActions}>
            <ChipButton
              title="+1 Read"
              icon="sf:plus.circle"
              variant="blue"
              onPress={() => onRecordRead(reading.id)}
            />
            {onUndoRead && (
              <ChipButton
                title="Undo"
                icon="sf:arrow.uturn.backward"
                variant="secondary"
                onPress={() => onUndoRead(reading.id)}
              />
            )}
          </View>
        ) : (
          <ChipButton
            title="Read Now (+1)"
            icon="sf:checkmark.circle"
            variant="success"
            onPress={() => onRecordRead(reading.id)}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 16,
    gap: 12,
    borderCurve: "continuous",
  },
  cardCompleted: {
    opacity: 0.9,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  authorBadgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  authorBadgeIcon: {
    width: 32,
    height: 32,
  },
  authorNameText: {
    fontSize: 16,
    fontWeight: "700",
  },
  authorBioText: {
    fontSize: 12,
    marginTop: 1,
  },
  cardActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  quoteWrapper: {
    paddingLeft: 4,
    gap: 6,
  },
  readingCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(142, 142, 147, 0.25)",
  },
  cardFooterActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timestampContainer: {
    flex: 1,
    gap: 2,
  },
  timestampText: {
    fontSize: 11,
  },
  timestampTextRead: {
    fontSize: 11,
    fontWeight: "600",
  },
});
