import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Card, ThemedText, ChipButton, Badge } from "@/components";
import { colors, spacing, radius } from "@/theme";
import type { Producer } from "@myself/shared";

interface ProducerHeaderSwitcherProps {
  activeProducer?: Producer;
  producers: Producer[];
  papConfigArs: number;
  onSelectProducer: (id: string) => void;
  onResetSeed?: () => void;
}

export function ProducerHeaderSwitcher({
  activeProducer,
  producers,
  papConfigArs,
  onSelectProducer,
  onResetSeed,
}: ProducerHeaderSwitcherProps) {
  return (
    <Card variant="elevated" style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.producerInfo}>
          <ThemedText variant="caption1" style={styles.label}>
            ESTÁS OPERANDO COMO:
          </ThemedText>
          <ThemedText variant="headline" style={styles.producerName}>
            {activeProducer?.name ?? "Seleccionar productor"}
          </ThemedText>
          <ThemedText variant="caption1" style={styles.locationText}>
            📍 {activeProducer?.address}
          </ThemedText>
        </View>

        <View style={styles.badgeColumn}>
          <Badge
            label={`1 PAP = $${papConfigArs.toLocaleString("es-AR")}`}
            variant="success"
            size="sm"
          />
          {activeProducer?.productionType && (
            <Badge
              label={activeProducer.productionType}
              variant="outline"
              size="sm"
              style={styles.typeBadge}
            />
          )}
        </View>
      </View>

      <ThemedText variant="caption2" style={styles.switchLabel}>
        Cambiar identidad (simular contraparte en otra pestaña o aquí):
      </ThemedText>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.switchRow}
      >
        {producers.map((prod) => {
          const isSelected = prod.id === activeProducer?.id;
          return (
            <ChipButton
              key={prod.id}
              title={prod.name}
              variant={isSelected ? "success" : "default"}
              onPress={() => onSelectProducer(prod.id)}
              style={styles.chip}
            />
          );
        })}
        {onResetSeed && (
          <ChipButton
            title="↺ Reiniciar Datos"
            variant="destructive"
            onPress={onResetSeed}
            style={styles.resetChip}
          />
        )}
      </ScrollView>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    backgroundColor: colors.secondarySystemBackground,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.separator,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.sm,
  },
  producerInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  label: {
    color: colors.secondaryLabel,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  producerName: {
    color: colors.label,
    fontWeight: "800",
    marginTop: 2,
  },
  locationText: {
    color: colors.secondaryLabel,
    marginTop: 2,
  },
  badgeColumn: {
    alignItems: "flex-end",
    gap: 4,
  },
  typeBadge: {
    marginTop: 4,
  },
  switchLabel: {
    color: colors.secondaryLabel,
    fontSize: 11,
    marginBottom: spacing.xs,
  },
  switchRow: {
    flexDirection: "row",
    gap: spacing.xs,
    paddingVertical: 2,
  },
  chip: {
    marginRight: spacing.xs,
  },
  resetChip: {
    borderColor: colors.systemRed,
  },
});
