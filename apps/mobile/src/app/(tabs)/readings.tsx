import { useCallback } from "react";
import { Stack, router, useFocusEffect } from "expo-router";
import { View, StyleSheet, ScrollView, Text, Alert } from "react-native";
import { Image } from "expo-image";
import { useReadings } from "@/hooks/use-readings";
import { type MeditationReadingWithAuthor } from "@/db/database";
import { AppButton, IconButton } from "@/components";
import { ReadingCard } from "@/features/readings/components/reading-card";
import { colors } from "@/theme/colors";
import { appErrorHandler } from "@/core/errors/mobile-error-handler";

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
      refreshReadings().catch((error) => {
        appErrorHandler.handle(error, {
          source: "ReadingsScreen.useFocusEffect",
        });
      });
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
    if (typeof window !== "undefined" && typeof window.confirm === "function") {
      const confirmed = window.confirm(
        `Are you sure you want to delete this passage by ${reading.author_name}?`,
      );
      if (confirmed) {
        void deleteReading(reading.id).catch((error) => {
          appErrorHandler.handle(error, {
            source: "ReadingsScreen.handleDelete",
          });
        });
      }
      return;
    }

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
            <ReadingCard
              key={reading.id}
              reading={reading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onRecordRead={recordRead}
            />
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
            <ReadingCard
              key={reading.id}
              reading={reading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onRecordRead={recordRead}
              onUndoRead={removeLastRead}
            />
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
