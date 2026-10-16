import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Card, ThemedText, AppButton, Badge } from "@/components";
import { colors, spacing, radius } from "@/theme";
import type { ProductPackage } from "@myself/shared";

interface TradeProposalModalProps {
  visible: boolean;
  targetPackage: ProductPackage | null;
  targetProducerName?: string;
  availableOwnPackages: ProductPackage[];
  onConfirmProposal: (offeredPackageId: string) => void;
  onClose: () => void;
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

  if (!targetPackage) return null;

  const selectedPkg = availableOwnPackages.find(
    (p) => p.id === selectedPackageId,
  );
  const canSubmit = !!selectedPackageId && (selectedPkg?.stockUnits ?? 0) > 0;

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
                label={targetPackage.productionType}
                variant="outline"
                size="sm"
              />
            </View>
          </Card>

          {/* Own packages selection */}
          <ThemedText variant="headline" style={styles.sectionTitle}>
            Elegí qué entregás a cambio (1 PAP):
          </ThemedText>

          <ScrollView style={styles.packageList}>
            {availableOwnPackages.length === 0 ? (
              <ThemedText variant="body" style={styles.emptyText}>
                No tenés productos cargados en tu inventario para ofrecer.
              </ThemedText>
            ) : (
              availableOwnPackages.map((ownPkg) => {
                const isSelected = ownPkg.id === selectedPackageId;
                const isOutOfStock = ownPkg.stockUnits <= 0;

                return (
                  <TouchableOpacity
                    key={ownPkg.id}
                    disabled={isOutOfStock}
                    onPress={() => setSelectedPackageId(ownPkg.id)}
                    style={[
                      styles.packageOption,
                      isSelected && styles.packageOptionSelected,
                      isOutOfStock && styles.packageOptionDisabled,
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isSelected }}
                    accessibilityLabel={`Seleccionar ${ownPkg.title}`}
                  >
                    <View style={styles.radioRow}>
                      <View
                        style={[
                          styles.radioButton,
                          isSelected && styles.radioButtonSelected,
                        ]}
                      >
                        {isSelected && <View style={styles.radioButtonDot} />}
                      </View>

                      <View style={styles.pkgTextContainer}>
                        <ThemedText
                          variant="body"
                          style={[
                            styles.pkgTitle,
                            isOutOfStock && styles.textDisabled,
                          ]}
                        >
                          {ownPkg.title}
                        </ThemedText>
                        <ThemedText variant="caption1" style={styles.pkgStock}>
                          {isOutOfStock
                            ? "Sin stock"
                            : `${ownPkg.stockUnits} disponible${ownPkg.stockUnits > 1 ? "s" : ""}`}
                        </ThemedText>
                      </View>

                      <Badge
                        label={`${ownPkg.papValue} PAP`}
                        variant={isSelected ? "success" : "neutral"}
                        size="sm"
                      />
                    </View>
                  </TouchableOpacity>
                );
              })
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
    fontWeight: "800",
  },
  subtitle: {
    color: colors.secondaryLabel,
    marginTop: 2,
  },
  targetCard: {
    backgroundColor: colors.secondarySystemBackground,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  cardHeader: {
    color: colors.secondaryLabel,
    fontWeight: "700",
  },
  targetTitle: {
    color: colors.label,
    marginTop: 2,
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
    backgroundColor: "rgba(52, 199, 89, 0.08)",
  },
  packageOptionDisabled: {
    opacity: 0.4,
  },
  radioRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
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
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.systemGreen,
  },
  pkgTextContainer: {
    flex: 1,
  },
  pkgTitle: {
    fontWeight: "600",
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
    backgroundColor: "rgba(52, 199, 89, 0.12)",
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  balanceText: {
    color: colors.systemGreen,
    fontWeight: "600",
    lineHeight: 18,
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
