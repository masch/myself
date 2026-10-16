import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { ThemedText, ChipButton } from "@/components";
import { colors, spacing } from "@/theme";
import type { ProductionType } from "@myself/shared";

interface GondolaFilterBarProps {
  selectedType?: ProductionType | "ALL";
  onSelectType: (type: ProductionType | "ALL") => void;
  maxDistanceKm?: number;
  onSelectMaxDistance: (km?: number) => void;
}

const TYPE_OPTIONS: { label: string; value: ProductionType | "ALL" }[] = [
  { label: "Todos", value: "ALL" },
  { label: "Agroecológico", value: "AGROECOLOGICAL" },
  { label: "Orgánico", value: "ORGANIC" },
  { label: "Convencional", value: "CONVENTIONAL" },
];

const DISTANCE_OPTIONS: { label: string; value?: number }[] = [
  { label: "Cualquier distancia", value: undefined },
  { label: "< 50 km", value: 50 },
  { label: "< 250 km", value: 250 },
  { label: "< 800 km", value: 800 },
];

export function GondolaFilterBar({
  selectedType = "ALL",
  onSelectType,
  maxDistanceKm,
  onSelectMaxDistance,
}: GondolaFilterBarProps) {
  return (
    <View style={styles.container}>
      <ThemedText variant="caption1" style={styles.filterTitle}>
        Filtrar por certificación:
      </ThemedText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {TYPE_OPTIONS.map((opt) => (
          <ChipButton
            key={opt.value}
            title={opt.label}
            variant={selectedType === opt.value ? "success" : "default"}
            onPress={() => onSelectType(opt.value)}
            style={styles.chip}
          />
        ))}
      </ScrollView>

      <ThemedText variant="caption1" style={styles.filterTitle}>
        Radio de cercanía:
      </ThemedText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {DISTANCE_OPTIONS.map((opt, idx) => (
          <ChipButton
            key={idx}
            title={opt.label}
            variant={maxDistanceKm === opt.value ? "success" : "default"}
            onPress={() => onSelectMaxDistance(opt.value)}
            style={styles.chip}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  filterTitle: {
    color: colors.secondaryLabel,
    fontSize: 11,
    marginTop: spacing.xs,
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    gap: spacing.xs,
    paddingBottom: 2,
  },
  chip: {
    marginRight: spacing.xs,
  },
});
