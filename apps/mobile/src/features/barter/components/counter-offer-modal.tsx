import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Card, ThemedText, AppButton, Badge } from "@/components";
import { primaryOfferedPackageId } from "..";
import {
  colors,
  fontWeights,
  layout,
  lineHeights,
  spacing,
  radius,
} from "@/theme";
import type { ProductPackage, TradeMatch } from "@myself/shared";
import { counterDeltaCopy } from "../cart-draft";

interface CounterOfferModalProps {
  visible: boolean;
  match: TradeMatch | null;
  /** Packages the requester currently offers (the one being replaced). */
  currentOfferedPackage?: ProductPackage;
  /** The package the requester asked for, whose units the counter may change. */
  targetPackage?: ProductPackage;
  /** Alternative packages from the requester catalog, stock-filtered. */
  candidates: ProductPackage[];
  onConfirm: (counterOfferedPackageId: string, counterUnits: number) => void;
  onClose: () => void;
}

export function CounterOfferModal({
  visible,
  match,
  currentOfferedPackage,
  targetPackage,
  candidates,
  onConfirm,
  onClose,
}: CounterOfferModalProps) {
  const [selectedPackageId, setSelectedPackageId] = useState<string>(
    candidates[0]?.id ?? "",
  );
  // The counter may move the total in either direction (rule 7): one stepper
  // sets the units of the replacement line, and the delta copy tells the
  // receiver what changed before they re-check.
  const [counterUnits, setCounterUnits] = useState(match?.totalPap ?? 1);

  if (!match) return null;

  const selectedPkg = candidates.find((p) => p.id === selectedPackageId);
  const canSubmit =
    !!selectedPackageId &&
    counterUnits >= 1 &&
    (selectedPkg?.stockUnits ?? 0) >= counterUnits &&
    (targetPackage?.stockUnits ?? 0) >= counterUnits;

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
              Pedí un producto distinto del catálogo del solicitante, o cambiá
              la cantidad. La contraoferta vuelve a la otra parte para
              re-chequeo.
            </ThemedText>
          </View>

          {/* Current offer being replaced */}
          <Card variant="subdued" style={styles.currentCard}>
            <ThemedText variant="caption1" style={styles.cardHeader}>
              OFERTA ORIGINAL (SE REEMPLAZA):
            </ThemedText>
            <ThemedText variant="headline" style={styles.currentTitle}>
              {currentOfferedPackage?.title ?? primaryOfferedPackageId(match)}
            </ThemedText>
            {/* Rule 8: the re-check reads the delta before deciding. */}
            <ThemedText variant="caption1" style={styles.deltaText}>
              {counterDeltaCopy(match.totalPap, counterUnits)}
            </ThemedText>
          </Card>

          {/* Units stepper: the counter proposes its own total, 1..stock of
              both sides (rule 7). */}
          <View style={styles.unitsRow}>
            <ThemedText variant="body">Unidades (PAP por lado):</ThemedText>
            <View style={styles.unitsStepper}>
              <AppButton
                title="−"
                variant="secondary"
                disabled={counterUnits <= 1}
                onPress={() => setCounterUnits((u) => Math.max(u - 1, 1))}
                style={styles.unitsBtn}
                accessibilityLabel="Quitar una unidad de la contraoferta"
              />
              <ThemedText variant="body" style={styles.unitsValue}>
                {counterUnits}
              </ThemedText>
              <AppButton
                title="+"
                variant="secondary"
                disabled={
                  counterUnits >= (selectedPkg?.stockUnits ?? 0) ||
                  counterUnits >= (targetPackage?.stockUnits ?? 0)
                }
                onPress={() => setCounterUnits((u) => u + 1)}
                style={styles.unitsBtn}
                accessibilityLabel="Agregar una unidad a la contraoferta"
              />
            </View>
          </View>

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

          {/* Balance notice */}
          <View style={styles.noticeBanner}>
            <ThemedText variant="caption1" style={styles.noticeText}>
              ⚖️ Los dos lados siempre suman lo mismo. La contraoferta vuelve a
              la otra parte para re-chequeo; el stock se reserva mientras la
              propuesta está abierta.
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
              onPress={() => onConfirm(selectedPackageId, counterUnits)}
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
  deltaText: {
    marginTop: spacing.xs,
    color: colors.secondaryLabel,
  },
  unitsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  unitsStepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  unitsBtn: {
    minWidth: 36,
  },
  unitsValue: {
    minWidth: 20,
    textAlign: "center",
    fontWeight: fontWeights.semibold,
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
