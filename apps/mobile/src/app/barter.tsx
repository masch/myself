import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { router } from "expo-router";
import {
  ScreenContainer,
  EmptyState,
  ThemedText,
  AppButton,
  useToast,
} from "@/components";
import { colors, spacing } from "@/theme";
import {
  useBarter,
  ProducerHeaderSwitcher,
  ProductPackageCard,
  GondolaFilterBar,
  TradeProposalModal,
} from "@/features/barter";
import type { ProductPackage } from "@myself/shared";

export default function BarterScreen() {
  const toast = useToast();
  const {
    activeProducer,
    producers,
    papConfigArs,
    gondolaPackages,
    activeProducerPackages,
    incomingMatches,
    outgoingMatches,
    productionTypeFilter,
    maxDistanceKm,
    setActiveProducer,
    setProductionTypeFilter,
    setMaxDistanceKm,
    createTradeProposal,
    resetToSeed,
  } = useBarter();

  const [selectedTargetPackage, setSelectedTargetPackage] =
    useState<ProductPackage | null>(null);

  // Proposals waiting on the active producer's decision.
  const actionableCount =
    incomingMatches.filter((m) => m.status === "PENDING").length +
    outgoingMatches.filter((m) => m.status === "COUNTER_OFFERED").length;

  const handleOpenProposal = (pkg: ProductPackage) => {
    setSelectedTargetPackage(pkg);
  };

  const handleConfirmProposal = (offeredPackageId: string) => {
    if (!selectedTargetPackage || !activeProducer) return;

    try {
      createTradeProposal({
        requesterId: activeProducer.id,
        targetProducerId: selectedTargetPackage.producerId,
        offeredPackageId,
        targetPackageId: selectedTargetPackage.id,
      });

      toast.success(
        `¡Propuesta enviada a ${
          producers.find((p) => p.id === selectedTargetPackage.producerId)?.name
        }!`,
      );
      setSelectedTargetPackage(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al enviar la propuesta",
      );
    }
  };

  const targetProducer = producers.find(
    (p) => p.id === selectedTargetPackage?.producerId,
  );

  return (
    <ScreenContainer.Scroll edges={["top", "bottom"]} style={styles.container}>
      {/* Producer identity header and multi-tab switcher */}
      <ProducerHeaderSwitcher
        activeProducer={activeProducer}
        producers={producers}
        papConfigArs={papConfigArs}
        onSelectProducer={setActiveProducer}
        onResetSeed={resetToSeed}
      />

      {/* Inbox entry point */}
      <View style={styles.inboxRow}>
        <AppButton
          title={
            actionableCount > 0
              ? `Bandeja de Trueques (${actionableCount})`
              : "Bandeja de Trueques"
          }
          variant="secondary"
          onPress={() => router.push("/barter-inbox")}
        />
      </View>

      {/* Filter bar */}
      <GondolaFilterBar
        selectedType={productionTypeFilter}
        onSelectType={setProductionTypeFilter}
        maxDistanceKm={maxDistanceKm}
        onSelectMaxDistance={setMaxDistanceKm}
      />

      <View style={styles.sectionHeader}>
        <ThemedText variant="title2" style={styles.sectionTitle}>
          Góndola de Productores ({gondolaPackages.length})
        </ThemedText>
        <ThemedText variant="caption1" style={styles.sectionSubtitle}>
          Seleccioná un producto para proponer un trueque exacto de 1 PAP
        </ThemedText>
      </View>

      {/* Products list */}
      {gondolaPackages.length === 0 ? (
        <EmptyState
          icon="sf:cart"
          title="No hay productos disponibles"
          description="Intentá cambiar los filtros de distancia o certificación."
          style={styles.emptyState}
        />
      ) : (
        gondolaPackages.map((pkg) => {
          const hasPending = outgoingMatches.some(
            (m) =>
              m.targetPackageId === pkg.id &&
              (m.status === "PENDING" || m.status === "COUNTER_OFFERED"),
          );

          return (
            <ProductPackageCard
              key={pkg.id}
              packageItem={pkg}
              hasPendingProposal={hasPending}
              onProposeTrade={handleOpenProposal}
            />
          );
        })
      )}

      {/* Proposal initiation modal */}
      <TradeProposalModal
        visible={!!selectedTargetPackage}
        targetPackage={selectedTargetPackage}
        targetProducerName={targetProducer?.name}
        availableOwnPackages={activeProducerPackages}
        onConfirmProposal={handleConfirmProposal}
        onClose={() => setSelectedTargetPackage(null)}
      />
    </ScreenContainer.Scroll>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.systemBackground,
  },
  inboxRow: {
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
  },
  sectionHeader: {
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.label,
    fontWeight: "700",
  },
  sectionSubtitle: {
    color: colors.secondaryLabel,
    marginTop: 2,
  },
  emptyState: {
    marginVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
});
