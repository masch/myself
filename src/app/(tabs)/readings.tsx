import { useCallback } from "react";
import { Stack, router, useFocusEffect } from "expo-router";
import { View, StyleSheet, ScrollView, Text, Alert } from "react-native";
import { Image } from "expo-image";
import { useReadings } from "@/hooks/use-readings";
import { type MeditationReadingWithAuthor } from "@/db/database";
import {
  AppButton,
  IconButton,
  ChipButton,
  MeditationText,
} from "@/components";
import { colors } from "@/theme/colors";

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

export default function ReadingsScreen() {
  const {
    readings,
    isLoading,
    refreshReadings,
    recordRead,
    removeLastRead,
    deleteReading,
  } = useReadings();

  useFocusEffect(
    useCallback(() => {
      refreshReadings();
    }, [refreshReadings]),
  );

  const handleEdit = (reading: MeditationReadingWithAuthor) => {
    router.push({
      pathname: "/reading-modal",
      params: {
        id: reading.id,
        authorId: reading.author_id,
        title: reading.title,
        content: reading.content,
      },
    });
  };

  const handleDelete = (reading: MeditationReadingWithAuthor) => {
    Alert.alert(
      "Delete Reading",
      `Are you sure you want to delete this passage by ${reading.author_name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteReading(reading.id),
        },
      ],
    );
  };

  const unreadReadings = readings.filter((r) => r.times_read === 0);
  const readReadings = readings.filter((r) => r.times_read > 0);
  const totalSessionsCount = readings.reduce((acc, r) => acc + r.times_read, 0);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.systemBackground }]}
      contentContainerStyle={styles.contentContainer}
      contentInsetAdjustmentBehavior="automatic"
    >
      <Stack.Screen
        options={{
          title: "Meditation Readings",
          headerLargeTitle: true,
          headerShadowVisible: false,
          headerRight: () => (
            <IconButton
              icon="sf:plus"
              color={colors.systemBlue}
              size="large"
              onPress={() => router.push("/reading-modal")}
            />
          ),
        }}
      />

      {/* Hero Stats Card */}
      <View
        style={[
          styles.heroCard,
          { backgroundColor: colors.secondarySystemBackground },
        ]}
      >
        <View style={styles.heroHeaderRow}>
          <Image
            source="sf:sparkles"
            style={[styles.heroIcon, { tintColor: colors.systemPurple }]}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.heroTitleText, { color: colors.label }]}>
              Pre-Meditation Passages
            </Text>
            <Text
              style={[
                styles.heroSubtitleText,
                { color: colors.secondaryLabel },
              ]}
            >
              {readings.length} philosophical texts • {totalSessionsCount} reads
              recorded
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.systemBlue }]}>
              {unreadReadings.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.secondaryLabel }]}>
              Unread
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.systemGreen }]}>
              {readReadings.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.secondaryLabel }]}>
              Read (1+ times)
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.systemPurple }]}>
              {totalSessionsCount}
            </Text>
            <Text style={[styles.statLabel, { color: colors.secondaryLabel }]}>
              Total Logs
            </Text>
          </View>
        </View>

        <AppButton
          title="Add New Reading"
          icon="sf:plus.circle.fill"
          variant="purple"
          onPress={() => router.push("/reading-modal")}
        />
      </View>

      {/* Unread Readings Section */}
      {unreadReadings.length > 0 && (
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.secondaryLabel }]}>
            NEW REFLECTIONS ({unreadReadings.length})
          </Text>
          {unreadReadings.map((reading) => (
            <View
              key={reading.id}
              style={[
                styles.readingCard,
                { backgroundColor: colors.secondarySystemBackground },
              ]}
            >
              {/* Card Header: Author info & Action buttons */}
              <View style={styles.cardHeader}>
                <View style={styles.authorBadgeContainer}>
                  <Image
                    source="sf:person.circle.fill"
                    style={[
                      styles.authorBadgeIcon,
                      { tintColor: colors.systemPurple },
                    ]}
                  />
                  <View>
                    <Text
                      style={[styles.authorNameText, { color: colors.label }]}
                    >
                      {reading.author_name}
                    </Text>
                    {reading.author_bio ? (
                      <Text
                        style={[
                          styles.authorBioText,
                          { color: colors.secondaryLabel },
                        ]}
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
                    onPress={() => handleEdit(reading)}
                  />
                  <IconButton
                    icon="sf:trash"
                    color={colors.systemRed}
                    size="medium"
                    onPress={() => handleDelete(reading)}
                  />
                </View>
              </View>

              {/* Quote Content */}
              <View style={styles.quoteWrapper}>
                {Boolean(reading.title) && (
                  <Text
                    style={[
                      styles.readingCardTitle,
                      { color: colors.systemPurple },
                    ]}
                  >
                    {reading.title}
                  </Text>
                )}
                <MeditationText
                  content={reading.content}
                  baseFontSize={15}
                  baseLineHeight={22}
                  textColor={colors.label}
                  accentColor={colors.systemPurple}
                />
              </View>

              {/* Card Footer: Timestamps & Read Toggle */}
              <View style={styles.cardFooter}>
                <View style={styles.timestampContainer}>
                  <Text
                    style={[
                      styles.timestampText,
                      { color: colors.secondaryLabel },
                    ]}
                  >
                    Added: {formatDate(reading.created_at)}
                  </Text>
                </View>

                <ChipButton
                  title="Read Now (+1)"
                  icon="sf:checkmark.circle"
                  variant="success"
                  onPress={() => recordRead(reading.id)}
                />
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Read Readings Section */}
      {readReadings.length > 0 && (
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.secondaryLabel }]}>
            READ & REFLECTED ({readReadings.length})
          </Text>
          {readReadings.map((reading) => (
            <View
              key={reading.id}
              style={[
                styles.readingCard,
                styles.readingCardCompleted,
                { backgroundColor: colors.secondarySystemBackground },
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.authorBadgeContainer}>
                  <Image
                    source="sf:checkmark.seal.fill"
                    style={[
                      styles.authorBadgeIconCompleted,
                      { tintColor: colors.systemGreen },
                    ]}
                  />
                  <View>
                    <Text
                      style={[styles.authorNameText, { color: colors.label }]}
                    >
                      {reading.author_name}
                    </Text>
                    {reading.author_bio ? (
                      <Text
                        style={[
                          styles.authorBioText,
                          { color: colors.secondaryLabel },
                        ]}
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
                    onPress={() => handleEdit(reading)}
                  />
                  <IconButton
                    icon="sf:trash"
                    color={colors.systemRed}
                    size="medium"
                    onPress={() => handleDelete(reading)}
                  />
                </View>
              </View>

              <View style={styles.quoteWrapper}>
                {Boolean(reading.title) && (
                  <Text
                    style={[
                      styles.readingCardTitle,
                      { color: colors.secondaryLabel },
                    ]}
                  >
                    {reading.title}
                  </Text>
                )}
                <MeditationText
                  content={reading.content}
                  baseFontSize={15}
                  baseLineHeight={22}
                  textColor={colors.secondaryLabel}
                  accentColor={colors.systemPurple}
                />
              </View>

              <View style={styles.cardFooter}>
                <View style={styles.timestampContainer}>
                  <Text
                    style={[
                      styles.timestampText,
                      { color: colors.secondaryLabel },
                    ]}
                  >
                    Added: {formatDate(reading.created_at)}
                  </Text>
                  <Text
                    style={[
                      styles.timestampTextRead,
                      { color: colors.systemGreen },
                    ]}
                  >
                    Read {reading.times_read}{" "}
                    {reading.times_read === 1 ? "time" : "times"} • Last:{" "}
                    {formatDate(reading.last_read_at)}
                  </Text>
                </View>

                <View style={styles.cardFooterActions}>
                  <ChipButton
                    title="+1 Read"
                    icon="sf:plus.circle"
                    variant="blue"
                    onPress={() => recordRead(reading.id)}
                  />
                  <ChipButton
                    title="Undo"
                    icon="sf:arrow.uturn.backward"
                    variant="secondary"
                    onPress={() => removeLastRead(reading.id)}
                  />
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Empty State */}
      {readings.length === 0 && !isLoading && (
        <View
          style={[
            styles.emptyCard,
            { backgroundColor: colors.secondarySystemBackground },
          ]}
        >
          <Image
            source="sf:book.closed.fill"
            style={[styles.emptyIcon, { tintColor: colors.systemPurple }]}
          />
          <Text style={[styles.emptyTitle, { color: colors.label }]}>
            No Readings Added Yet
          </Text>
          <Text
            style={[styles.emptySubtitle, { color: colors.secondaryLabel }]}
          >
            Add inspiring passages and philosophical quotes to read right before
            meditating.
          </Text>
          <AppButton
            title="Create First Reading"
            variant="purple"
            onPress={() => router.push("/reading-modal")}
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 18,
  },
  heroCard: {
    padding: 20,
    borderRadius: 16,
    gap: 14,
    borderCurve: "continuous",
  },
  heroHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: 4,
  },
  heroIcon: {
    width: 36,
    height: 36,
  },
  heroTitleText: {
    fontSize: 18,
    fontWeight: "700",
  },
  heroSubtitleText: {
    fontSize: 13,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingTop: 4,
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 22,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: "rgba(142, 142, 147, 0.3)",
  },
  sectionContainer: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    paddingHorizontal: 4,
  },
  readingCard: {
    padding: 16,
    borderRadius: 16,
    gap: 12,
    borderCurve: "continuous",
  },
  readingCardCompleted: {
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
  authorBadgeIconCompleted: {
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
  quoteText: {
    fontSize: 15,
    lineHeight: 22,
    fontStyle: "italic",
    marginTop: -8,
  },
  quoteTextCompleted: {
    textDecorationLine: "none",
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
  emptyCard: {
    padding: 32,
    borderRadius: 16,
    alignItems: "center",
    gap: 12,
    marginTop: 20,
  },
  emptyIcon: {
    width: 48,
    height: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
