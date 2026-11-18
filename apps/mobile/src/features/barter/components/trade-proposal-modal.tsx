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
  /** The target producer's in-stock inventory: the ask side is a cart too. */
  availableTargetPackages: ProductPackage[];
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
  availableTargetPackages,
  onConfirmProposal,
  onClose,
}: TradeProposalModalProps) {
  // The two-sided cart (issue #162): the offered side starts empty and the
  // target side starts with the tapped card at 1 unit. Both are edited here.
  const [offeredDraft, setOfferedDraft] = useState<CartDraft>({ lines: [] });
  // The ask side is a cart as well (issue #162): it starts with the tapped
  // card at 1 unit and the operator may add more of that producer's products.
  const [targetDraft, setTargetDraft] = useState<CartDraft>({
    lines: targetPackage ? [{ packageId: targetPackage.id, units: 1 }] : [],
  });
  const [ownQuery, setOwnQuery] = useState("");
  const [targetQuery, setTargetQuery] = useState("");

  if (!targetPackage) return null;

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

            <CartLines
              label="OFRECÉS"
              draft={offeredDraft}
              packages={availableOwnPackages}
              onSetUnits={(packageId, units, stock) =>
                setOfferedDraft((current) =>
                  setCartLineUnits(current, packageId, units, stock),
                )
              }
              onRemove={(packageId) =>
                setOfferedDraft((current) => removeCartLine(current, packageId))
              }
            />

            <CartLines
              label="PEDÍS"
              draft={targetDraft}
              packages={[targetPackage!, ...availableTargetPackages]}
              onSetUnits={(packageId, units, stock) =>
                setTargetDraft((current) =>
                  setCartLineUnits(current, packageId, units, stock),
                )
              }
              onRemove={(packageId) =>
                setTargetDraft((current) => removeCartLine(current, packageId))
              }
            />

            {/* The target producer's inventory: the ask side is a cart too —
                the tapped card is the first line, more products of the same
                producer may join it. */}
            <ThemedText variant="headline" style={styles.sectionTitle}>
              Pedís a {targetProducerName} (1 PAP por paquete):
            </ThemedText>

            {availableTargetPackages.length > 1 ? (
              <ThemedTextInput
                value={targetQuery}
                onChangeText={(value) => setTargetQuery(value)}
                placeholder={`Buscar en el inventario de ${targetProducerName ?? "tu contraparte"}`}
                accessibilityLabel="Buscar en el inventario del productor"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                testID="target-package-search"
              />
            ) : null}

            <View style={styles.packageList} testID="target-package-list">
              {filterPackagesByTitle(availableTargetPackages, targetQuery).map(
                (targetPkg) => {
                  const line = targetDraft.lines.find(
                    (l) => l.packageId === targetPkg.id,
                  );
                  return (
                    <PackageOfferOption
                      key={targetPkg.id}
                      ownPackage={targetPkg}
                      isSelected={!!line}
                      onSelect={(packageId) => {
                        setTargetDraft((current) =>
                          line
                            ? removeCartLine(current, packageId)
                            : addCartLine(current, targetPkg),
                        );
                      }}
                    />
                  );
                },
              )}
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

            <View style={styles.packageList} testID="own-package-list">
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
          </ScrollView>

          {/* Balance banner, pinned above the buttons (issue #162): the live
              totals and, when they diverge, why — always on screen while the
              carts change, so the user reads the gap without scrolling. The
              reason is the same one the store enforces, so the button's
              disable state and its explanation can never disagree. */}
          <View
            style={[
              styles.balanceBanner,
              balanceError ? styles.balanceBannerError : null,
            ]}
          >
            <ThemedText
              variant="caption1"
              style={[
                styles.balanceText,
                balanceError ? styles.balanceTextError : null,
              ]}
            >
              {balanceError
                ? `⚖️ Ofrecés ${cartTotal(offeredDraft)} PAP ↔ Pedís ${cartTotal(targetDraft)} PAP — ${balanceError}`
                : `⚖️ Trueque justo: ${cartTotal(offeredDraft)} PAP ↔ ${cartTotal(targetDraft)} PAP. El stock se reserva mientras la propuesta está abierta.`}
            </ThemedText>
          </View>

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
              accessibilityLabel={
                canSubmit
                  ? "Enviar Match"
                  : `Enviar Match no disponible: ${balanceError}`
              }
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

function CartLines({
  label,
  draft,
  packages,
  onSetUnits,
  onRemove,
}: {
  label: string;
  draft: CartDraft;
  packages: ProductPackage[];
  onSetUnits: (packageId: string, units: number, stock: number) => void;
  onRemove: (packageId: string) => void;
}) {
  if (draft.lines.length === 0) return null;
  return (
    <View style={styles.cartBlock}>
      <View style={styles.cartHeaderRow}>
        <ThemedText variant="callout" style={styles.cartHeader}>
          {label}:
        </ThemedText>
        <Badge label={`${cartTotal(draft)} PAP`} variant="primary" size="md" />
      </View>
      {draft.lines.map((line) => {
        const pkg = packages.find((p) => p.id === line.packageId);
        const atStockCap = line.units >= (pkg?.stockUnits ?? 0);
        return (
          <View key={line.packageId} style={styles.cartLine}>
            <View style={styles.cartLineText}>
              <ThemedText
                variant="body"
                style={styles.cartLineTitle}
                numberOfLines={1}
              >
                {pkg?.title ?? line.packageId}
              </ThemedText>
              {atStockCap ? (
                <ThemedText variant="caption2" style={styles.cartLineCap}>
                  Sin más stock de este paquete
                </ThemedText>
              ) : null}
            </View>
            <View style={styles.stepper}>
              <AppButton
                title="−"
                variant="secondary"
                disabled={line.units <= 1}
                onPress={() =>
                  line.units <= 1
                    ? onRemove(line.packageId)
                    : onSetUnits(
                        line.packageId,
                        line.units - 1,
                        pkg?.stockUnits ?? 1,
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
                disabled={atStockCap}
                onPress={() =>
                  onSetUnits(
                    line.packageId,
                    line.units + 1,
                    pkg?.stockUnits ?? 1,
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
  balanceBannerError: {
    backgroundColor: colors.destructiveSubdued,
  },
  balanceText: {
    color: colors.systemGreen,
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.xs,
  },
  balanceTextError: {
    color: colors.systemRed,
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
  cartHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  cartHeader: {
    color: colors.secondaryLabel,
    fontWeight: fontWeights.semibold,
  },
  cartLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  cartLineText: {
    flex: 1,
  },
  cartLineTitle: {
    fontWeight: fontWeights.medium,
  },
  cartLineCap: {
    color: colors.secondaryLabel,
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
