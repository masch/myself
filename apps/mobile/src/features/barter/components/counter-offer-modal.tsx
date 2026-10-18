import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Card, ThemedText, AppButton, Badge } from "@/components";
import {
  colors,
  fontWeights,
  layout,
  lineHeights,
  spacing,
  radius,
} from "@/theme";
import type { ProductPackage, TradeMatch } from "@myself/shared";

interface CounterOfferModalProps {
  visible: boolean;
  match: TradeMatch | null;
  /** Packages the requester currently offers (the one being replaced). */
  currentOfferedPackage?: ProductPackage;
  /** Alternative packages from the requester catalog, stock-filtered. */
  candidates: ProductPackage[];
  onConfirm: (counterOfferedPackageId: string) => void;
  onClose: () => void;
}

export function CounterOfferModal({
  visible,
  match,
  currentOfferedPackage,
  candidates,
  onConfirm,
  onClose,
}: CounterOfferModalProps) {
  const [selectedPackageId, setSelectedPackageId] = useState<string>(
    candidates[0]?.id ?? "",
  );

  if (!match) return null;

  const selectedPkg = candidates.find((p) => p.id === selectedPackageId);
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
              Contraofertar
            </ThemedText>
            <ThemedText variant="callout" style={styles.subtitle}>
              Pedí un producto distinto del catálogo del solicitante. Solo hay
              una ronda de contraoferta: la otra parte puede aceptar o rechazar.
            </ThemedText>
          </View>

          {/* Current offer being replaced */}
          <Card variant="subdued" style={styles.currentCard}>
            <ThemedText variant="caption1" style={styles.cardHeader}>
              OFERTA ORIGINAL (SE REEMPLAZA):
            </ThemedText>
            <ThemedText variant="headline" style={styles.currentTitle}>
              {currentOfferedPackage?.title ?? match.offeredPackageId}
            </ThemedText>
          </Card>

          <ThemedText variant="headline" style={styles.sectionTitle}>
            Elegí la alternativa (1 PAP):
          </ThemedText>

          <ScrollView style={styles.packageList}>
            {candidates.length === 0 ? (
              <ThemedText variant="body" style={styles.emptyText}>
                El solicitante no tiene otros productos con stock para
                contraofertar.
              </ThemedText>
            ) : (
              candidates.map((pkg) => {
                const isSelected = pkg.id === selectedPackageId;
                return (
                  <TouchableOpacity
                    key={pkg.id}
                    onPress={() => setSelectedPackageId(pkg.id)}
                    style={[
                      styles.packageOption,
                      isSelected && styles.packageOptionSelected,
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isSelected }}
                    aria-checked={isSelected}
                    accessibilityLabel={`Seleccionar ${pkg.title}`}
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
                        <ThemedText variant="body" style={styles.pkgTitle}>
                          {pkg.title}
                        </ThemedText>
                        <ThemedText variant="caption1" style={styles.pkgStock}>
                          {pkg.stockUnits} disponible
                          {pkg.stockUnits > 1 ? "s" : ""}
                        </ThemedText>
                      </View>

                      <Badge
                        label={`${pkg.papValue} PAP`}
                        variant={isSelected ? "success" : "neutral"}
                        size="sm"
                      />
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          {/* Single-round notice */}
          <View style={styles.noticeBanner}>
            <ThemedText variant="caption1" style={styles.noticeText}>
              ⚖️ El trueque se mantiene justo 1:1 en PAP. Si el solicitante
              acepta, el stock se descuenta de ambos paquetes.
            </ThemedText>
          </View>

          <View style={styles.actionsRow}>
            <AppButton
              title="Cancelar"
              variant="secondary"
              onPress={onClose}
              style={styles.cancelBtn}
            />
            <AppButton
              title="Enviar Contraoferta"
              variant="primary"
              disabled={!canSubmit}
              onPress={() => onConfirm(selectedPackageId)}
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
  currentCard: {
    backgroundColor: colors.secondarySystemBackground,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  cardHeader: {
    color: colors.secondaryLabel,
    fontWeight: fontWeights.bold,
  },
  currentTitle: {
    color: colors.label,
    marginTop: spacing.xxs,
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
  emptyText: {
    color: colors.secondaryLabel,
    paddingVertical: spacing.md,
    textAlign: "center",
  },
  noticeBanner: {
    backgroundColor: colors.systemGreen12,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  noticeText: {
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
