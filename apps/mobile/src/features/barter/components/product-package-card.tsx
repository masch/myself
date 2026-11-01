import React from "react";
import { View, StyleSheet } from "react-native";
import { Card, ThemedText, AppButton, Badge } from "@/components";
import { colors, fontWeights, spacing, radius } from "@/theme";
import type { Producer, ProductPackage } from "@myself/shared";
import { productionTypeLabel } from "../production-type-labels";
import {
  formatCatalogEquivalence,
  type CatalogPackageInfo,
} from "../catalog-packages";

interface ProductPackageCardProps {
  packageItem: ProductPackage & {
    producer: Producer;
    distanceKm: number;
  };
  onProposeTrade: (pkg: ProductPackage) => void;
  hasPendingProposal?: boolean;
}

/**
 * The price the PDF prints, with the cents it prints: `$22.158,20`.
 *
 * Rendered beside the paper's own basis (`por kg`, `por 750 ml`) so a user can
 * compare the price the catalog loaded with the price this app gives the package.
 */
function formatPrintedPrice(amountArs: number): string {
  return `$${amountArs.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function ProductPackageCard({
  packageItem,
  onProposeTrade,
  hasPendingProposal = false,
}: ProductPackageCardProps) {
  const isOutOfStock = packageItem.stockUnits <= 0;
  const catalog: CatalogPackageInfo | undefined = packageItem.catalog;

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
        <Badge
          label={productionTypeLabel(packageItem.productionType)}
          variant="outline"
          size="sm"
        />
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

      {/* What the printed catalog charges, then what this package hands over for
          1 PAP. A package the catalog does not print (the four POC packs) has no
          `catalog` block and renders neither line. */}
      {catalog ? (
        <View style={styles.catalogBlock}>
          <ThemedText
            variant="caption1"
            style={styles.catalogListPrice}
            testID={`package-list-price-${packageItem.id}`}
          >{`Precio de lista: ${formatPrintedPrice(
            catalog.listPriceArs,
          )} ${catalog.listPriceBasis}`}</ThemedText>
          <ThemedText
            variant="caption1"
            style={styles.catalogEquivalence}
            testID={`package-pap-equivalence-${packageItem.id}`}
          >
            {formatCatalogEquivalence(packageItem.papValue, catalog)}
          </ThemedText>
        </View>
      ) : null}

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
    fontWeight: fontWeights.bold,
  },
  producerName: {
    color: colors.secondaryLabel,
    marginTop: spacing.xxs,
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
  catalogBlock: {
    gap: spacing.xxs,
    marginTop: spacing.xxs,
    marginBottom: spacing.xs,
  },
  catalogListPrice: {
    color: colors.secondaryLabel,
  },
  catalogEquivalence: {
    color: colors.label,
    fontWeight: fontWeights.semibold,
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
    fontWeight: fontWeights.semibold,
  },
});
