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
import type { ProductPackage } from "@myself/shared";
import { productionTypeLabel } from "../production-type-labels";
import { filterPackagesByTitle } from "../barter-selectors";
import { formatCatalogEquivalence } from "../catalog-packages";

interface TradeProposalModalProps {
  visible: boolean;
  targetPackage: ProductPackage | null;
  targetProducerName?: string;
  availableOwnPackages: ProductPackage[];
  onConfirmProposal: (offeredPackageId: string) => void;
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
            <ThemedText variant="caption2" style={styles.pkgCatalog}>
              {formatCatalogEquivalence(
                ownPackage.papValue,
                ownPackage.catalog,
              )}
            </ThemedText>
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
  const [selectedPackageId, setSelectedPackageId] = useState<string>(
    availableOwnPackages[0]?.id ?? "",
  );
  const [ownQuery, setOwnQuery] = useState("");

  if (!targetPackage) return null;

  const selectedPkg = availableOwnPackages.find(
    (p) => p.id === selectedPackageId,
  );
  const canSubmit = !!selectedPackageId && (selectedPkg?.stockUnits ?? 0) > 0;

  // A printed producer carries up to 77 packages, so the offer list is searched
  // instead of scrolled. Narrowing it moves the selection to the first offer
  // still visible: keeping a hidden selection would let "Enviar Match" submit a
  // package the operator can no longer see.
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
            {/* What the target really means: how much of it 1 PAP buys. */}
            {targetPackage.catalog ? (
              <ThemedText variant="caption1" style={styles.targetCatalog}>
                {formatCatalogEquivalence(
                  targetPackage.papValue,
                  targetPackage.catalog,
                )}
              </ThemedText>
            ) : null}
          </Card>

          {/* Own packages selection */}
          <ThemedText variant="headline" style={styles.sectionTitle}>
            Elegí qué entregás a cambio (1 PAP):
          </ThemedText>

          {availableOwnPackages.length > 0 ? (
            <ThemedTextInput
              value={ownQuery}
              onChangeText={(value) => {
                setOwnQuery(value);
                setSelectedPackageId((current) =>
                  resolveSelectedOffer(
                    filterPackagesByTitle(availableOwnPackages, value),
                    current,
                  ),
                );
              }}
              placeholder="Buscar en tu inventario"
              accessibilityLabel="Buscar en tu inventario"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              testID="own-package-search"
            />
          ) : null}

          <ScrollView style={styles.packageList}>
            {availableOwnPackages.length === 0 ? (
              <ThemedText variant="body" style={styles.emptyText}>
                No tenés productos cargados en tu inventario para ofrecer.
              </ThemedText>
            ) : visibleOffers.length === 0 ? (
              <ThemedText variant="body" style={styles.emptyText}>
                Ningún producto tuyo coincide con “{ownQuery.trim()}”. Probá con
                otra palabra o limpiá la búsqueda.
              </ThemedText>
            ) : (
              visibleOffers.map((ownPkg) => (
                <PackageOfferOption
                  key={ownPkg.id}
                  ownPackage={ownPkg}
                  isSelected={ownPkg.id === selectedPackageId}
                  onSelect={setSelectedPackageId}
                />
              ))
            )}
          </ScrollView>

          {/* Balance confirmation banner */}
          <View style={styles.balanceBanner}>
            <ThemedText variant="caption1" style={styles.balanceText}>
              ⚖️ Trueque Justo 1:1: Ofrecés 1 PAP por 1 PAP solicitado. El stock
              no se bloquea hasta que la contraparte acepte.
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
              onPress={() => onConfirmProposal(selectedPackageId)}
              style={styles.submitBtn}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  targetCatalog: {
    color: colors.label,
    fontWeight: fontWeights.semibold,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    color: colors.label,
    marginBottom: spacing.xs,
  },
  packageList: {
    maxHeight: 220,
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
  pkgCatalog: {
    color: colors.label,
    fontWeight: fontWeights.semibold,
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
  cancelBtn: {
    flex: 1,
  },
  submitBtn: {
    flex: 2,
  },
});
