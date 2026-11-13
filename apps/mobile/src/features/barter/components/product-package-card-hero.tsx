import React from "react";
import { StyleSheet, View } from "react-native";
import { Card, ThemedText } from "@/components";
import { colors, fontWeights, letterSpacings, spacing } from "@/theme";
import { formatCatalogQuantity } from "../catalog-packages";
import {
  formatPrintedPrice,
  packagingLabel,
  papAdjustment,
} from "../product-card-copy";
import {
  ADJUSTMENT_COLORS,
  PackageHandOver,
  PackageOrigin,
  PackageProducerFilter,
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
 *
 * Since the producer and its origin were highlighted, the card opens with that
 * block and the equivalence follows as an equation — `1 PAP =` above `4,5 litros`
 * — instead of a quantity with a caption underneath it.
 */
export function ProductPackageCardHero({
  packageItem,
  onProposeTrade,
  hasPendingProposal = false,
  producerFilterId,
  onToggleProducerFilter,
}: PackageCardLayoutProps) {
  const catalog = packageItem.catalog;
  const packaging = catalog ? packagingLabel(catalog) : null;
  const adjustment = catalog
    ? papAdjustment(catalog, packageItem.priceArs)
    : null;

  return (
    <Card variant="elevated" style={packageCardStyles.card}>
      <PackageOrigin packageItem={packageItem} />

      {/* A package that predates the catalog block (a POC pack, an injected
          state) has no equivalence to state: it still renders, led by its name. */}
      {catalog ? (
        <View style={styles.hero}>
          <ThemedText variant="caption2" style={styles.equationAnchor}>
            1 PAP =
          </ThemedText>
          <ThemedText
            variant="largeTitle"
            style={styles.quantity}
            testID={`package-quantity-${packageItem.id}`}
          >
            {formatCatalogQuantity(catalog.quantity, catalog.measure)}
          </ThemedText>
        </View>
      ) : null}

      <View style={styles.identity}>
        <ThemedText variant="headline" style={styles.title}>
          {packageItem.title}
        </ThemedText>
      </View>

      <PackageProducerFilter
        packageItem={packageItem}
        producerFilterId={producerFilterId}
        onToggleProducerFilter={onToggleProducerFilter}
      />

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
  equationAnchor: {
    color: colors.secondaryLabel,
    fontWeight: fontWeights.semibold,
    letterSpacing: letterSpacings.caption,
  },
  identity: {
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.label,
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
});
