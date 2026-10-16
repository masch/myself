import React from "react";
import { View, StyleSheet } from "react-native";
import { Card, ThemedText, AppButton, Badge } from "@/components";
import { colors, spacing, radius } from "@/theme";
import type { Producer, ProductPackage } from "@myself/shared";

interface ProductPackageCardProps {
  packageItem: ProductPackage & {
    producer: Producer;
    distanceKm: number;
  };
  onProposeTrade: (pkg: ProductPackage) => void;
  hasPendingProposal?: boolean;
}

export function ProductPackageCard({
  packageItem,
  onProposeTrade,
  hasPendingProposal = false,
}: ProductPackageCardProps) {
  const isOutOfStock = packageItem.stockUnits <= 0;

  return (
    <Card variant="elevated" style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <ThemedText variant="title2" style={styles.title}>
            {packageItem.title}
          </ThemedText>
          <ThemedText variant="callout" style={styles.producerName}>
            de {packageItem.producer.name}
          </ThemedText>
        </View>

        <View style={styles.papBadgeContainer}>
          <Badge
            label={`${packageItem.papValue} PAP`}
            variant="primary"
            size="md"
          />
        </View>
      </View>

      <View style={styles.metaRow}>
        <Badge
          label={`📍 ${packageItem.distanceKm} km`}
          variant="outline"
          size="sm"
        />
        <Badge label={packageItem.productionType} variant="outline" size="sm" />
        <Badge
          label={
            isOutOfStock
              ? "Sin stock"
              : `${packageItem.stockUnits} disponible${packageItem.stockUnits > 1 ? "s" : ""}`
          }
          variant={isOutOfStock ? "destructive" : "neutral"}
          size="sm"
        />
      </View>

      <ThemedText variant="caption1" style={styles.addressText}>
        Ubicación: {packageItem.producer.address}
      </ThemedText>

      <View style={styles.footerRow}>
        <ThemedText variant="callout" style={styles.priceArs}>
          Valor: ${packageItem.priceArs.toLocaleString("es-AR")} ARS
        </ThemedText>

        <AppButton
          title={
            hasPendingProposal
              ? "Propuesta Pendiente"
              : isOutOfStock
                ? "Sin Stock"
                : "Pedir Match"
          }
          variant={hasPendingProposal ? "secondary" : "primary"}
          disabled={isOutOfStock || hasPendingProposal}
          onPress={() => onProposeTrade(packageItem)}
          accessibilityLabel={`Pedir match por ${packageItem.title}`}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.secondarySystemBackground,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.xs,
  },
  titleContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  title: {
    color: colors.label,
    fontWeight: "700",
  },
  producerName: {
    color: colors.secondaryLabel,
    marginTop: 2,
  },
  papBadgeContainer: {
    alignItems: "flex-end",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  addressText: {
    color: colors.secondaryLabel,
    marginBottom: spacing.sm,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.separator,
  },
  priceArs: {
    color: colors.label,
    fontWeight: "600",
  },
});
