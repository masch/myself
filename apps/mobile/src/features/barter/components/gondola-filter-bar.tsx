import React from "react";
import { View, StyleSheet } from "react-native";
import { ThemedText, ChipButton } from "@/components";
import { colors, fontSizes, spacing } from "@/theme";
import type { ProductionType } from "@myself/shared";
import { CARD_VARIANTS, type CardVariant } from "../card-variant";
import { PRODUCTION_TYPE_LABELS } from "../production-type-labels";

interface GondolaFilterBarProps {
  selectedType?: ProductionType | "ALL";
  onSelectType: (type: ProductionType | "ALL") => void;
  maxDistanceKm?: number;
  onSelectMaxDistance: (km?: number) => void;
  cardVariant: CardVariant;
  onSelectCardVariant: (variant: CardVariant) => void;
}

/**
 * The order is a UI decision (agroecological first, because that is most of the
 * network); the words come from `PRODUCTION_TYPE_LABELS`, the same map the
 * selector rows and the package badges render.
 */
const FILTER_TYPE_ORDER: ProductionType[] = [
  "AGROECOLOGICAL",
  "ORGANIC",
  "BIODYNAMIC",
  "VEGAN",
  "CONVENTIONAL",
];

export const TYPE_OPTIONS: { label: string; value: ProductionType | "ALL" }[] =
  [
    { label: "Todos", value: "ALL" },
    ...FILTER_TYPE_ORDER.map((value) => ({
      value,
      label: PRODUCTION_TYPE_LABELS[value],
    })),
  ];

const DISTANCE_OPTIONS: { label: string; value?: number }[] = [
  { label: "Cualquier distancia", value: undefined },
  { label: "< 50 km", value: 50 },
  { label: "< 250 km", value: 250 },
  { label: "< 800 km", value: 800 },
];

/**
 * The layouts are named by what their card looks like, not by their artboard name:
 * a validation user picks "Cantidad" or "Ficha" without a design vocabulary. The
 * labels live here and the order comes from `CARD_VARIANTS`, so the row and the
 * two card layouts cannot drift apart.
 */
const CARD_VARIANT_LABELS: Record<CardVariant, string> = {
  cantidad: "Cantidad",
  ficha: "Ficha",
};

export const CARD_VARIANT_OPTIONS: { label: string; value: CardVariant }[] =
  CARD_VARIANTS.map((value) => ({ value, label: CARD_VARIANT_LABELS[value] }));

export function GondolaFilterBar({
  selectedType = "ALL",
  onSelectType,
  maxDistanceKm,
  onSelectMaxDistance,
  cardVariant,
  onSelectCardVariant,
}: GondolaFilterBarProps) {
  return (
    <View style={styles.container}>
      <ThemedText variant="caption1" style={styles.filterTitle}>
        Filtrar por certificación:
      </ThemedText>
      {/* Wrapping rows instead of horizontal ones: a horizontal row hides its last
          option behind a drag nobody is told about, which on a phone cut "< 800
          km" in half and read as a broken chip. Every option is visible now. */}
      <View style={styles.row} testID="gondola-filter-row">
        {TYPE_OPTIONS.map((opt) => (
          <ChipButton
            key={opt.value}
            title={opt.label}
            variant={selectedType === opt.value ? "success" : "default"}
            onPress={() => onSelectType(opt.value)}
          />
        ))}
      </View>

      <ThemedText variant="caption1" style={styles.filterTitle}>
        Radio de cercanía:
      </ThemedText>
      <View style={styles.row} testID="gondola-distance-row">
        {DISTANCE_OPTIONS.map((opt, idx) => (
          <ChipButton
            key={idx}
            title={opt.label}
            variant={maxDistanceKm === opt.value ? "success" : "default"}
            onPress={() => onSelectMaxDistance(opt.value)}
          />
        ))}
      </View>

      {/* The layout switch sits with the filters because it answers the same kind
          of question: how do I want to see the gondola? It is under test, so the
          row is only a choice between two cards, never a setting to configure. */}
      <ThemedText variant="caption1" style={styles.filterTitle}>
        Ver card:
      </ThemedText>
      <View style={styles.row} testID="gondola-card-variant-row">
        {CARD_VARIANT_OPTIONS.map((opt) => (
          <ChipButton
            key={opt.value}
            testID={`card-variant-${opt.value}`}
            title={opt.label}
            variant={cardVariant === opt.value ? "success" : "default"}
            onPress={() => onSelectCardVariant(opt.value)}
          />
        ))}
      </View>
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
    fontSize: fontSizes.xs,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    paddingBottom: spacing.xxs,
  },
});
