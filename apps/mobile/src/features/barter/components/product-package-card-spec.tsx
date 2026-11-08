import React from "react";
import { StyleSheet, View, type StyleProp, type TextStyle } from "react-native";
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
 * Layout B — the same facts as a label/value sheet.
 *
 * The reason to try it: every card puts its values on the same right-hand axis,
 * so a column of packages reads like rows of a table and comparing two oils
 * becomes scanning one column instead of re-parsing two paragraphs. It pays for
 * that with height and with a label the user has to read.
 *
 * Nothing is dropped relative to layout A — the difference is which number the
 * eye meets first, never which numbers exist.
 */
export function ProductPackageCardSpec({
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
      <View style={styles.head}>
        <ThemedText variant="headline" style={styles.title}>
          {packageItem.title}
        </ThemedText>
        <ThemedText variant="caption1" style={styles.headSub}>
          {`${packageItem.producer.name} · ${locationLine(
            packageItem.distanceKm,
            packageItem.producer.address,
          )}`}
        </ThemedText>
      </View>

      {catalog ? (
        <View style={styles.spec}>
          <SpecRow
            label="Te llevás por 1 PAP"
            value={formatCatalogQuantity(catalog.quantity, catalog.measure)}
            testID={`package-quantity-${packageItem.id}`}
          />
          {packaging ? <SpecRow label="Cómo viene" value={packaging} /> : null}
          {adjustment ? (
            <SpecRow
              label="Ajuste a 1 PAP"
              value={adjustment.compact}
              valueStyle={ADJUSTMENT_COLORS[adjustment.direction]}
              testID={`package-pap-adjustment-${packageItem.id}`}
            />
          ) : null}
        </View>
      ) : null}

      {catalog ? (
        <>
          {/* The printed quotation is the provenance of every number above it, so
              it sits apart and in a smaller voice instead of competing with the
              answer the card exists to give. */}
          <View style={styles.rule} />
          <ThemedText variant="caption2" style={styles.sourceLabel}>
            PRECIO DEL CATÁLOGO IMPRESO
          </ThemedText>
          <ThemedText variant="callout" style={styles.sourceValue}>
            {`${formatPrintedPrice(catalog.listPriceArs)} ${catalog.listPriceBasis}`}
          </ThemedText>
        </>
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

/**
 * One row of the sheet: label on the left, value on the shared right edge.
 *
 * It is local on purpose — a generic row component used by one layout would be an
 * abstraction with a single consumer, and the value styling is where these two
 * layouts differ by design.
 */
function SpecRow({
  label,
  value,
  valueStyle,
  testID,
}: {
  label: string;
  value: string;
  valueStyle?: StyleProp<TextStyle>;
  testID?: string;
}) {
  return (
    <View style={styles.specRow}>
      <ThemedText variant="caption1" style={styles.specLabel}>
        {label}
      </ThemedText>
      <ThemedText
        variant="headline"
        style={[styles.specValue, valueStyle]}
        testID={testID}
      >
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.label,
  },
  headSub: {
    color: colors.secondaryLabel,
    marginTop: spacing.xxs,
  },
  spec: {
    marginTop: spacing.xs,
  },
  specRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: spacing.compact,
    paddingVertical: spacing.xs,
  },
  specLabel: {
    color: colors.secondaryLabel,
    flexShrink: 1,
  },
  specValue: {
    color: colors.label,
    textAlign: "right",
    flexShrink: 1,
  },
  rule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.separator,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  sourceLabel: {
    color: colors.secondaryLabel,
    fontWeight: fontWeights.semibold,
    letterSpacing: letterSpacings.caption,
  },
  sourceValue: {
    color: colors.label,
    marginTop: spacing.xxs,
  },
});
