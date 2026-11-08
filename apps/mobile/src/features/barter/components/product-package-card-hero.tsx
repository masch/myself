import React from "react";
import { StyleSheet, View } from "react-native";
import { Card, ThemedText } from "@/components";
import { colors, fontWeights, letterSpacings, spacing } from "@/theme";
import { formatCatalogQuantity } from "../catalog-packages";
import {
  formatPrintedPrice,
  locationLine,
  packagingLabel,
  papAdjustment,
} from "../product-card-copy";
import {
  ADJUSTMENT_COLORS,
  PackageHandOver,
  PackageStatePills,
  packageCardStyles,
  type PackageCardLayoutProps,
} from "./product-card-parts";

/**
 * Layout A — the quantity is the card's headline.
 *
 * The defect this layout answers, in the user's words: the printed product name
 * was larger than "the proportional part that is 1 PAP". Somebody standing in the
 * gondola is not comparing packaging, they are comparing **how much they get for
 * one PAP**, so that is what the eye lands on first and the printed name becomes
 * identity underneath it.
 *
 * The packaging line exists to resolve the contradiction the old card created: it
 * announced `x 1/2 litro` at the top and `4,5 litros` in a caption, and nothing
 * said both were true (`9 envases de 500 ml` is how they are).
 */
export function ProductPackageCardHero({
  packageItem,
  onProposeTrade,
  hasPendingProposal = false,
}: PackageCardLayoutProps) {
  const catalog = packageItem.catalog;
  const packaging = catalog ? packagingLabel(catalog) : null;
  const adjustment = catalog
    ? papAdjustment(catalog, packageItem.priceArs)
    : null;

  return (
    <Card variant="elevated" style={packageCardStyles.card}>
      {/* A package that predates the catalog block (a POC pack, an injected
          state) has no equivalence to state: it still renders, led by its name. */}
      {catalog ? (
        <View style={styles.hero}>
          <ThemedText
            variant="largeTitle"
            style={styles.quantity}
            testID={`package-quantity-${packageItem.id}`}
          >
            {formatCatalogQuantity(catalog.quantity, catalog.measure)}
          </ThemedText>
          <ThemedText variant="caption1" style={styles.perPap}>
            POR 1 PAP
          </ThemedText>
        </View>
      ) : null}

      <View style={styles.identity}>
        <ThemedText variant="headline" style={styles.title}>
          {packageItem.title}
        </ThemedText>
        <ThemedText variant="callout" style={styles.producer}>
          de {packageItem.producer.name}
        </ThemedText>
      </View>

      {catalog ? (
        <View style={styles.truth}>
          {packaging ? (
            <ThemedText variant="callout" style={styles.packaging}>
              {`Son ${packaging}.`}
            </ThemedText>
          ) : null}
          <ThemedText variant="caption1" style={styles.listPrice}>
            {`El catálogo ${packaging ? "los" : "lo"} cobra a ${formatPrintedPrice(
              catalog.listPriceArs,
            )} ${catalog.listPriceBasis}.`}
          </ThemedText>
        </View>
      ) : null}

      {adjustment ? (
        <ThemedText
          variant="caption1"
          style={[styles.adjustment, ADJUSTMENT_COLORS[adjustment.direction]]}
          testID={`package-pap-adjustment-${packageItem.id}`}
        >
          {adjustment.sentence}
        </ThemedText>
      ) : null}

      <ThemedText variant="caption1" style={styles.location}>
        {locationLine(packageItem.distanceKm, packageItem.producer.address)}
      </ThemedText>

      <PackageStatePills packageItem={packageItem} />

      <PackageHandOver
        packageItem={packageItem}
        onProposeTrade={onProposeTrade}
        hasPendingProposal={hasPendingProposal}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginBottom: spacing.compact,
  },
  quantity: {
    color: colors.label,
    fontWeight: fontWeights.bold,
  },
  perPap: {
    color: colors.secondaryLabel,
    fontWeight: fontWeights.semibold,
    letterSpacing: letterSpacings.caption,
    marginTop: spacing.xxs,
  },
  identity: {
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.label,
  },
  producer: {
    color: colors.secondaryLabel,
    marginTop: spacing.xxs,
  },
  truth: {
    marginBottom: spacing.sm,
  },
  packaging: {
    color: colors.label,
  },
  listPrice: {
    color: colors.secondaryLabel,
    marginTop: spacing.xxs,
  },
  adjustment: {
    fontWeight: fontWeights.semibold,
    marginBottom: spacing.sm,
  },
  location: {
    color: colors.secondaryLabel,
  },
});
