import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import {
  Card,
  ThemedText,
  ThemedTextInput,
  AppButton,
  Badge,
} from "@/components";
import {
  colors,
  fontWeights,
  layout,
  lineHeights,
  opacities,
  spacing,
  radius,
} from "@/theme";
import type { ProductPackage, TradeLine } from "@myself/shared";
import { productionTypeLabel } from "../production-type-labels";
import { filterPackagesByTitle } from "../barter-selectors";
import { catalogQuantity, formatCatalogQuantity } from "../catalog-packages";
import { packagingLabel } from "../product-card-copy";
import {
  addCartLine,
  cartBalanceError,
  cartTotal,
  removeCartLine,
  setCartLineUnits,
  type CartDraft,
} from "../cart-draft";

interface TradeProposalModalProps {
  visible: boolean;
  targetPackage: ProductPackage | null;
  targetProducerName?: string;
  availableOwnPackages: ProductPackage[];
  /**
   * The cart the modal sends: both sides are edited here, so the parent
   * receives full line lists instead of one offered package id.
   */
  onConfirmProposal: (
    offeredLines: TradeLine[],
    targetLines: TradeLine[],
  ) => void;
  onClose: () => void;
}

/**
 * The offer to keep selected when the inventory search narrows.
 *
 * Narrowing must not move the operator's choice while it still matches (they
 * picked the fifth offer, and typing more should not silently send the first);
 * it only moves when the choice left the list, and then to the first offer still
 * visible, so "Enviar Match" can never submit an offer nobody can see.
 */
export function resolveSelectedOffer<T extends { id: string }>(
  visible: T[],
  selectedId: string,
): string {
  if (visible.some((pkg) => pkg.id === selectedId)) return selectedId;
  return visible[0]?.id ?? "";
}

export interface PackageOfferOptionProps {
  ownPackage: ProductPackage;
  isSelected: boolean;
  onSelect: (packageId: string) => void;
}

/**
 * One own package the producer can hand over, with what that package really is:
 * a catalog package says how much cheese or how many bottles 1 PAP means, so the
 * producer agrees to a quantity and not to a label. A package the catalog does
 * not print (the four POC packs) keeps the badge-only copy.
 *
 * Exported because the enclosing `Modal` portals its children and renders
 * nothing on the server, so the copy is pinned by rendering this row.
 */
export function PackageOfferOption({
  ownPackage,
  isSelected,
  onSelect,
}: PackageOfferOptionProps) {
  const isOutOfStock = ownPackage.stockUnits <= 0;

  return (
    <TouchableOpacity
      disabled={isOutOfStock}
      onPress={() => onSelect(ownPackage.id)}
      style={[
        styles.packageOption,
        isSelected && styles.packageOptionSelected,
        isOutOfStock && styles.packageOptionDisabled,
      ]}
      accessibilityRole="radio"
      accessibilityState={{ checked: isSelected }}
      aria-checked={isSelected}
      accessibilityLabel={`Seleccionar ${ownPackage.title}`}
    >
      <View style={styles.radioRow}>
        <View
          style={[styles.radioButton, isSelected && styles.radioButtonSelected]}
        >
          {isSelected && <View style={styles.radioButtonDot} />}
        </View>

        <View style={styles.pkgTextContainer}>
          <ThemedText
            variant="body"
            style={[styles.pkgTitle, isOutOfStock && styles.textDisabled]}
          >
            {ownPackage.title}
          </ThemedText>
          <ThemedText variant="caption1" style={styles.pkgStock}>
            {isOutOfStock
              ? "Sin stock"
              : `${ownPackage.stockUnits} disponible${ownPackage.stockUnits > 1 ? "s" : ""}`}
          </ThemedText>
          {ownPackage.catalog ? (
            <View style={styles.pkgCatalogBlock}>
              <CatalogDisclosure pkg={ownPackage} variant="caption2" />
            </View>
          ) : null}
        </View>

        <Badge
          label={`${ownPackage.papValue} PAP`}
          variant={isSelected ? "success" : "neutral"}
          size="sm"
        />
      </View>
    </TouchableOpacity>
  );
}

export function TradeProposalModal({
  visible,
  targetPackage,
  targetProducerName,
  availableOwnPackages,
  onConfirmProposal,
  onClose,
}: TradeProposalModalProps) {
  // The two-sided cart (issue #162): the offered side starts empty and the
  // target side starts with the tapped card at 1 unit. Both are edited here.
  const [offeredDraft, setOfferedDraft] = useState<CartDraft>({ lines: [] });
  const [targetUnits, setTargetUnits] = useState(1);
  const [ownQuery, setOwnQuery] = useState("");

  if (!targetPackage) return null;

  const targetDraft: CartDraft = {
    lines: [{ packageId: targetPackage.id, units: targetUnits }],
  };
  const balanceError = cartBalanceError(offeredDraft, targetDraft);
  const canSubmit = balanceError === null;

  // A printed producer carries up to 77 packages, so the offer list is searched
  // instead of scrolled.
  const visibleOffers = filterPackagesByTitle(availableOwnPackages, ownQuery);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          <View style={styles.header}>
            <ThemedText variant="title2" style={styles.title}>
              Proponer Trueque (Match)
            </ThemedText>
            <ThemedText variant="callout" style={styles.subtitle}>
              Pedís un producto a {targetProducerName}
            </ThemedText>
          </View>

          {/* One scroll body (issue #162): the carts, the inventory search and
              the list share the sheet's only scroll container, so nothing can
              escape its bounds and overlay its neighbours. */}
          <ScrollView
            style={styles.sheetBody}
            contentContainerStyle={styles.sheetBodyContent}
          >
            {/* Requested item card */}
            <Card variant="subdued" style={styles.targetCard}>
              <ThemedText variant="caption1" style={styles.cardHeader}>
                PRODUCTO QUE QUERÉS:
              </ThemedText>
              <ThemedText variant="headline" style={styles.targetTitle}>
                {targetPackage.title}
              </ThemedText>
              <View style={styles.targetMeta}>
                <Badge
                  label={`${targetPackage.papValue} PAP ($${targetPackage.priceArs.toLocaleString("es-AR")})`}
                  variant="primary"
                  size="sm"
                />
                <Badge
                  label={productionTypeLabel(targetPackage.productionType)}
                  variant="outline"
                  size="sm"
                />
              </View>
              {/* What the target really means: how much of it 1 PAP buys, and what
                the rounding costs, in the same words the gondola cards use. */}
              {targetPackage.catalog ? (
                <View style={styles.targetCatalogBlock}>
                  <CatalogDisclosure pkg={targetPackage} variant="caption1" />
                </View>
              ) : null}
            </Card>

            {/* The offered cart: one stepper per chosen line. */}
            {offeredDraft.lines.length > 0 ? (
              <View style={styles.cartBlock}>
                <ThemedText variant="caption1" style={styles.cartHeader}>
                  OFRECÉS ({cartTotal(offeredDraft)} PAP):
                </ThemedText>
                {offeredDraft.lines.map((line) => {
                  const pkg = availableOwnPackages.find(
                    (p) => p.id === line.packageId,
                  );
                  return (
                    <View key={line.packageId} style={styles.cartLine}>
                      <ThemedText
                        variant="body"
                        style={styles.cartLineTitle}
                        numberOfLines={1}
                      >
                        {pkg?.title ?? line.packageId}
                      </ThemedText>
                      <View style={styles.stepper}>
                        <AppButton
                          title="−"
                          variant="secondary"
                          onPress={() =>
                            line.units <= 1
                              ? setOfferedDraft((current) =>
                                  removeCartLine(current, line.packageId),
                                )
                              : setOfferedDraft((current) =>
                                  setCartLineUnits(
                                    current,
                                    line.packageId,
                                    line.units - 1,
                                    pkg?.stockUnits ?? 1,
                                  ),
                                )
                          }
                          style={styles.stepperBtn}
                          accessibilityLabel={`Quitar una unidad de ${pkg?.title ?? line.packageId}`}
                        />
                        <ThemedText variant="body" style={styles.stepperValue}>
                          {line.units}
                        </ThemedText>
                        <AppButton
                          title="+"
                          variant="secondary"
                          disabled={line.units >= (pkg?.stockUnits ?? 0)}
                          onPress={() =>
                            setOfferedDraft((current) =>
                              setCartLineUnits(
                                current,
                                line.packageId,
                                line.units + 1,
                                pkg?.stockUnits ?? 1,
                              ),
                            )
                          }
                          style={styles.stepperBtn}
                          accessibilityLabel={`Agregar una unidad de ${pkg?.title ?? line.packageId}`}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : null}

            {/* The target stepper: units of the tapped card. */}
            <View style={styles.cartBlock}>
              <ThemedText variant="caption1" style={styles.cartHeader}>
                PEDÍS ({cartTotal(targetDraft)} PAP):
              </ThemedText>
              <View style={styles.cartLine}>
                <ThemedText
                  variant="body"
                  style={styles.cartLineTitle}
                  numberOfLines={1}
                >
                  {targetPackage.title}
                </ThemedText>
                <View style={styles.stepper}>
                  <AppButton
                    title="−"
                    variant="secondary"
                    disabled={targetUnits <= 1}
                    onPress={() => setTargetUnits((u) => Math.max(u - 1, 1))}
                    style={styles.stepperBtn}
                    accessibilityLabel={`Quitar una unidad de ${targetPackage.title}`}
                  />
                  <ThemedText variant="body" style={styles.stepperValue}>
                    {targetUnits}
                  </ThemedText>
                  <AppButton
                    title="+"
                    variant="secondary"
                    disabled={targetUnits >= targetPackage.stockUnits}
                    onPress={() => setTargetUnits((u) => u + 1)}
                    style={styles.stepperBtn}
                    accessibilityLabel={`Agregar una unidad de ${targetPackage.title}`}
                  />
                </View>
              </View>
            </View>

            {/* Own packages selection */}
            <ThemedText variant="headline" style={styles.sectionTitle}>
              Elegí qué entregás a cambio (1 PAP por paquete):
            </ThemedText>

            {availableOwnPackages.length > 0 ? (
              <ThemedTextInput
                value={ownQuery}
                onChangeText={(value) => setOwnQuery(value)}
                placeholder="Buscar en tu inventario"
                accessibilityLabel="Buscar en tu inventario"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                testID="own-package-search"
              />
            ) : null}

            <View style={styles.packageList}>
              {availableOwnPackages.length === 0 ? (
                <ThemedText variant="body" style={styles.emptyText}>
                  No tenés productos cargados en tu inventario para ofrecer.
                </ThemedText>
              ) : visibleOffers.length === 0 ? (
                <ThemedText variant="body" style={styles.emptyText}>
                  Ningún producto tuyo coincide con “{ownQuery.trim()}”. Probá
                  con otra palabra o limpiá la búsqueda.
                </ThemedText>
              ) : (
                visibleOffers.map((ownPkg) => {
                  const line = offeredDraft.lines.find(
                    (l) => l.packageId === ownPkg.id,
                  );
                  return (
                    <PackageOfferOption
                      key={ownPkg.id}
                      ownPackage={ownPkg}
                      isSelected={!!line}
                      onSelect={(packageId) => {
                        setOfferedDraft((current) =>
                          line
                            ? removeCartLine(current, packageId)
                            : addCartLine(current, ownPkg),
                        );
                      }}
                    />
                  );
                })
              )}
            </View>

            {/* Balance banner: the live totals and, when they diverge, why. */}
            <View style={styles.balanceBanner}>
              <ThemedText variant="caption1" style={styles.balanceText}>
                {balanceError ??
                  `⚖️ Trueque justo: ${cartTotal(offeredDraft)} PAP ↔ ${cartTotal(targetDraft)} PAP. El stock se reserva mientras la propuesta está abierta.`}
              </ThemedText>
            </View>
          </ScrollView>

          {/* Action buttons */}
          <View style={styles.actionsRow}>
            <AppButton
              title="Cancelar"
              variant="secondary"
              onPress={onClose}
              style={styles.cancelBtn}
            />
            <AppButton
              title="Enviar Match"
              variant="primary"
              disabled={!canSubmit}
              onPress={() =>
                onConfirmProposal(offeredDraft.lines, targetDraft.lines)
              }
              style={styles.submitBtn}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

/**
 * What a package really hands over, in the words the gondola cards already use:
 * the quantity, the containers it comes in, and the difference against the PAP it
 * trades.
 *
 * The modal used to print the same facts as a PAP fraction (`real 0,97 PAP`). Two
 * screens describing one trade in two languages is how a user learns to distrust
 * both, so the copy comes from `product-card-copy` — the same module the cards read.
 */
function CatalogDisclosure({
  pkg,
  variant,
}: {
  pkg: ProductPackage;
  variant: "caption1" | "caption2";
}) {
  const catalog = pkg.catalog;

  if (!catalog) return null;

  const packaging = packagingLabel(catalog);
  const quantity = formatCatalogQuantity(
    catalogQuantity(catalog),
    catalog.measure,
  );

  return (
    <>
      <ThemedText variant={variant} style={styles.catalogQuantity}>
        {packaging ? `${quantity} · ${packaging}` : quantity}
      </ThemedText>
    </>
  );
}

const styles = StyleSheet.create({
  catalogQuantity: {
    color: colors.secondaryLabel,
  },
  targetCatalogBlock: {
    marginTop: spacing.xs,
  },
  pkgCatalogBlock: {
    gap: spacing.xxs,
  },
  overlay: {
    flex: 1,
    backgroundColor: colors.scrim,
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: colors.systemBackground,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    maxHeight: "85%",
  },
  header: {
    marginBottom: spacing.md,
  },
  title: {
    color: colors.label,
    fontWeight: fontWeights.heavy,
  },
  subtitle: {
    color: colors.secondaryLabel,
    marginTop: spacing.xxs,
  },
  targetCard: {
    backgroundColor: colors.secondarySystemBackground,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  cardHeader: {
    color: colors.secondaryLabel,
    fontWeight: fontWeights.bold,
  },
  targetTitle: {
    color: colors.label,
    marginTop: spacing.xxs,
  },
  targetMeta: {
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    color: colors.label,
    marginBottom: spacing.xs,
  },
  sheetBody: {
    flexGrow: 0,
  },
  sheetBodyContent: {
    paddingBottom: spacing.sm,
  },
  packageList: {
    marginBottom: spacing.sm,
  },
  packageOption: {
    borderWidth: 1.5,
    borderColor: colors.separator,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    backgroundColor: colors.systemBackground,
  },
  packageOptionSelected: {
    borderColor: colors.systemGreen,
    backgroundColor: colors.systemGreen8,
  },
  packageOptionDisabled: {
    opacity: opacities.disabled,
  },
  radioRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  radioButton: {
    width: layout.iconSize.md,
    height: layout.iconSize.md,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.separator,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.sm,
  },
  radioButtonSelected: {
    borderColor: colors.systemGreen,
  },
  radioButtonDot: {
    width: layout.iconSize.xs,
    height: layout.iconSize.xs,
    borderRadius: radius.full,
    backgroundColor: colors.systemGreen,
  },
  pkgTextContainer: {
    flex: 1,
  },
  pkgTitle: {
    fontWeight: fontWeights.semibold,
    color: colors.label,
  },
  pkgStock: {
    color: colors.secondaryLabel,
  },
  textDisabled: {
    color: colors.secondaryLabel,
  },
  emptyText: {
    color: colors.secondaryLabel,
    paddingVertical: spacing.md,
    textAlign: "center",
  },
  balanceBanner: {
    backgroundColor: colors.systemGreen12,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  balanceText: {
    color: colors.systemGreen,
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.xs,
  },
  actionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  // Cart blocks (issue #162): the running totals per side, with one stepper
  // row per chosen line.
  cartBlock: {
    marginBottom: spacing.md,
  },
  cartHeader: {
    color: colors.secondaryLabel,
    fontWeight: fontWeights.semibold,
    marginBottom: spacing.xs,
  },
  cartLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  cartLineTitle: {
    flex: 1,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  stepperBtn: {
    minWidth: 36,
  },
  stepperValue: {
    minWidth: 20,
    textAlign: "center",
    fontWeight: fontWeights.semibold,
  },
  cancelBtn: {
    flex: 1,
  },
  submitBtn: {
    flex: 2,
  },
});
