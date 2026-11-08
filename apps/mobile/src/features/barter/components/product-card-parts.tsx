import React from "react";
import { StyleSheet, View, type ColorValue } from "react-native";
import { AppButton, Badge, ThemedText } from "@/components";
import { colors, fontWeights, letterSpacings, radius, spacing } from "@/theme";
import type { ProductPackage } from "@myself/shared";
import type { GondolaPackage } from "../barter-selectors";
import { productionTypeLabel } from "../production-type-labels";
import type { PapAdjustmentDirection } from "../product-card-copy";

/**
 * The parts both card layouts render identically.
 *
 * The two layouts differ in hierarchy — one leads with the quantity, the other
 * with a label/value sheet — but not in what a package *is*. The states of a
 * package (certification, stock), the traded PAP and the action that starts a
 * trade are the same facts in both, so they have one implementation: a validation
 * switch that also changed the button label would compare two different products
 * instead of two hierarchies.
 */

export interface PackageCardLayoutProps {
  packageItem: GondolaPackage;
  onProposeTrade: (pkg: ProductPackage) => void;
  hasPendingProposal?: boolean;
}

/**
 * The two states that change a decision, and nothing else.
 *
 * The distance used to be a third pill beside them while the address was its own
 * line; both moved into one context sentence, because a badge that only repeats
 * "this is not next door" spends the row's width without changing a choice.
 */
export function PackageStatePills({
  packageItem,
}: {
  packageItem: GondolaPackage;
}) {
  const isOutOfStock = packageItem.stockUnits <= 0;

  return (
    <View style={styles.pills}>
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
  );
}

/**
 * What the user hands over, and the action that offers the trade.
 *
 * The PAP count varies per package (one presentation can be worth several, up to
 * ten) so it belongs on the card; the ARS value of one PAP does not — it is the
 * same in all 1531 cards and the list header states it once.
 */
export function PackageHandOver({
  packageItem,
  onProposeTrade,
  hasPendingProposal = false,
}: PackageCardLayoutProps) {
  const isOutOfStock = packageItem.stockUnits <= 0;

  return (
    <View style={styles.footer}>
      <View style={styles.handOver}>
        <ThemedText variant="caption2" style={styles.handOverLabel}>
          ENTREGÁS
        </ThemedText>
        <ThemedText variant="callout" style={styles.handOverValue}>
          {`${packageItem.papValue} PAP`}
        </ThemedText>
      </View>

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
  );
}

/** The card shell both layouts share: same surface, same margin, same radius. */
export const packageCardStyles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.secondarySystemBackground,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
});

/**
 * The colour of the rounding line, shared by both layouts.
 *
 * Colour never carries the state on its own: every sentence this map colours also
 * says `abajo`, `arriba` or `Coincide exacto` in words, so the card survives a
 * colour-blind reader and a greyscale screenshot.
 */
export const ADJUSTMENT_COLORS: Record<
  PapAdjustmentDirection,
  { color: ColorValue }
> = {
  below: { color: colors.systemOrange },
  above: { color: colors.systemGreen },
  exact: { color: colors.secondaryLabel },
};

const styles = StyleSheet.create({
  pills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.compact,
    paddingTop: spacing.compact,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.separator,
  },
  handOver: {
    flexDirection: "column",
  },
  handOverLabel: {
    color: colors.secondaryLabel,
    fontWeight: fontWeights.semibold,
    letterSpacing: letterSpacings.caption,
  },
  handOverValue: {
    color: colors.label,
    fontWeight: fontWeights.semibold,
    marginTop: spacing.xxs,
  },
});
