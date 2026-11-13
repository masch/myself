import React from "react";
import { StyleSheet, View, type ColorValue } from "react-native";
import { AppButton, Badge, ChipButton, ThemedText } from "@/components";
import { colors, fontWeights, letterSpacings, radius, spacing } from "@/theme";
import type { ProductPackage } from "@myself/shared";
import type { GondolaPackage } from "../barter-selectors";
import {
  distanceLabel,
  type PapAdjustmentDirection,
} from "../product-card-copy";
import { productionTypeLabel } from "../production-type-labels";

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

/** The facts every card and its footer render, with no view state attached. */
export interface PackageCardContentProps {
  packageItem: GondolaPackage;
  onProposeTrade: (pkg: ProductPackage) => void;
  hasPendingProposal?: boolean;
}

export interface PackageCardLayoutProps extends PackageCardContentProps {
  /** The producer the gondola is narrowed to, when any. */
  producerFilterId?: string;
  /**
   * Toggles the producer filter. Required on purpose: a layout that forgot to wire
   * the chip would ship a control that does nothing, and the user asked for it in
   * every card.
   */
  onToggleProducerFilter: (producerId: string) => void;
}

/**
 * The producer filter, as one chip under the producer line of every card.
 *
 * The control is the chip and only the chip. What the gondola is currently
 * filtered by is declared once on the list header, so the same fact never repeats
 * down a list of fifteen cards — the rule the PAP anchor already follows.
 *
 * `ChipButton` owns the pill, the press feedback and the button role, so this part
 * only owns the copy, the pressed state and the accessible name. The two labels
 * say what pressing does, never just what is on screen: idle it narrows to this
 * producer, active it removes the filter.
 */
export function PackageProducerFilter({
  packageItem,
  producerFilterId,
  onToggleProducerFilter,
}: Pick<
  PackageCardLayoutProps,
  "packageItem" | "producerFilterId" | "onToggleProducerFilter"
>) {
  const producerName = packageItem.producer.name;
  const isActive = producerFilterId === packageItem.producerId;

  return (
    <View style={styles.producerFilter}>
      <ChipButton
        testID={`card-producer-filter-${packageItem.producerId}`}
        title={
          isActive ? `Solo ${producerName}` : `Ver solo de ${producerName}`
        }
        variant={isActive ? "success" : "secondary"}
        onPress={() => onToggleProducerFilter(packageItem.producerId)}
        accessibilityLabel={
          isActive
            ? `Quitar el filtro de productor ${producerName}`
            : `Ver solo los productos de ${producerName}`
        }
        accessibilityState={{ selected: isActive }}
        aria-selected={isActive}
      />
    </View>
  );
}

/**
 * Who sells it and where it comes from, as the block that opens every card.
 *
 * The producer, the distance and the place decide whether a trade is even
 * practical — nobody drives to Tilcara for one PAP — and they sat in a grey
 * caption under the printed price. The user asked for them highlighted
 * **on every card** (`por card`), never once in the list header: the producer
 * changes between the packages of one list, so a header cannot name it.
 *
 * The block is inset instead of bleeding to the card edges on purpose: a
 * full-width band would need `overflow: hidden` on the shell, and that clips the
 * elevated card's shadow into a flat rectangle on iOS.
 */
export function PackageOrigin({
  packageItem,
}: {
  packageItem: GondolaPackage;
}) {
  return (
    <View style={styles.origin} testID={`card-origin-${packageItem.id}`}>
      <ThemedText variant="headline" style={styles.originProducer}>
        {packageItem.producer.name}
      </ThemedText>
      <View style={styles.originMeta}>
        <Badge
          label={distanceLabel(packageItem.distanceKm)}
          variant="success"
          size="sm"
        />
        <ThemedText variant="caption1" style={styles.originPlace}>
          {packageItem.producer.address}
        </ThemedText>
      </View>
    </View>
  );
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
}: PackageCardContentProps) {
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
  origin: {
    backgroundColor: colors.systemGreen12,
    borderRadius: radius.md,
    paddingHorizontal: spacing.compact,
    paddingVertical: spacing.sm,
    marginBottom: spacing.compact,
  },
  originProducer: {
    color: colors.label,
    fontWeight: fontWeights.bold,
  },
  originMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.xxs,
  },
  originPlace: {
    color: colors.secondaryLabel,
    flexShrink: 1,
  },
  producerFilter: {
    flexDirection: "row",
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
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
