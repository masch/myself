import { useCallback } from "react";
import { Stack, router, useFocusEffect } from "expo-router";
import { View, StyleSheet } from "react-native";
import { useReadings } from "@/hooks/use-readings";
import { type MeditationReadingWithAuthor } from "@/infrastructure/persistence/database";
import {
  AppButton,
  AppIcon,
  EmptyState,
  IconButton,
  ScreenContainer,
  Card,
  ThemedText,
} from "@/components";
import { ReadingCard } from "@/features/readings/components/reading-card";
import { confirmDelete } from "@/features/readings/confirm-delete";
import { colors, spacing } from "@/theme";
import { appErrorHandler } from "@/infrastructure/errors/mobile-error-handler";

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
    confirmDelete(
      `Are you sure you want to delete this passage by ${reading.author_name}?`,
      () => {
        void deleteReading(reading.id).catch((error) => {
          appErrorHandler.handle(error, {
            source: "ReadingsScreen.handleDelete",
          });
        });
      },
    );
  };

  const unreadReadings = readings.filter((r) => r.times_read === 0);
  const readReadings = readings.filter((r) => r.times_read > 0);
  const totalSessionsCount = readings.reduce((acc, r) => acc + r.times_read, 0);

  return (
    <ScreenContainer.Scroll>
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
              accessibilityLabel="Add new reading"
              onPress={() => router.push("/reading-modal")}
            />
          ),
        }}
      />

      {/* Hero Stats Card */}
      <Card variant="subdued" padding="lg" style={styles.heroCard}>
        <View style={styles.heroHeaderRow}>
          <AppIcon name="sf:sparkles" size={36} color={colors.systemPurple} />
          <View style={{ flex: 1 }}>
            <ThemedText variant="title2">Pre-Meditation Passages</ThemedText>
            <ThemedText variant="caption1" color={colors.secondaryLabel}>
              {readings.length} philosophical texts • {totalSessionsCount} reads
              recorded
            </ThemedText>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <ThemedText
              variant="title2"
              color={colors.systemBlue}
              style={styles.statNumber}
            >
              {unreadReadings.length}
            </ThemedText>
            <ThemedText variant="caption2" color={colors.secondaryLabel}>
              Unread
            </ThemedText>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <ThemedText
              variant="title2"
              color={colors.systemGreen}
              style={styles.statNumber}
            >
              {readReadings.length}
            </ThemedText>
            <ThemedText variant="caption2" color={colors.secondaryLabel}>
              Read (1+ times)
            </ThemedText>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <ThemedText
              variant="title2"
              color={colors.systemPurple}
              style={styles.statNumber}
            >
              {totalSessionsCount}
            </ThemedText>
            <ThemedText variant="caption2" color={colors.secondaryLabel}>
              Total Logs
            </ThemedText>
          </View>
        </View>

        <AppButton
          title="Add New Reading"
          icon="sf:plus.circle.fill"
          variant="purple"
          onPress={() => router.push("/reading-modal")}
        />
      </Card>

      {/* Unread Readings Section */}
      {unreadReadings.length > 0 && (
        <View style={styles.sectionContainer}>
          <ThemedText
            variant="caption1"
            color={colors.secondaryLabel}
            style={styles.sectionTitle}
          >
            NEW REFLECTIONS ({unreadReadings.length})
          </ThemedText>
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
          <ThemedText
            variant="caption1"
            color={colors.secondaryLabel}
            style={styles.sectionTitle}
          >
            READ & REFLECTED ({readReadings.length})
          </ThemedText>
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
        <EmptyState.Card
          icon="sf:book.closed.fill"
          iconColor={colors.systemPurple}
          iconSize={48}
          title="No Readings Added Yet"
          description="Add inspiring passages and philosophical quotes to read right before meditating."
          style={{ marginTop: spacing.lg - 4 }}
          action={
            <AppButton
              title="Create First Reading"
              variant="purple"
              onPress={() => router.push("/reading-modal")}
            />
          }
        />
      )}
    </ScreenContainer.Scroll>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    gap: spacing.md - 2,
  },
  heroHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 4,
    paddingBottom: spacing.xs,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingTop: spacing.xs,
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontWeight: "700",
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.separator,
  },

  sectionContainer: {
    gap: spacing.sm + 4,
  },
  sectionTitle: {
    letterSpacing: 0.8,
    paddingHorizontal: spacing.xs,
  },
});
