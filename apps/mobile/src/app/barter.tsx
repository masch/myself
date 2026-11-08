import React, { useCallback, useMemo, useState } from "react";
import { View, StyleSheet } from "react-native";
import { router } from "expo-router";
import {
  ScreenContainer,
  EmptyState,
  ThemedText,
  AppButton,
  useToast,
} from "@/components";
import { colors, fontWeights, layout, spacing } from "@/theme";
import {
  useBarter,
  ProducerHeaderSwitcher,
  ProductPackageCard,
  GondolaFilterBar,
  GondolaSearch,
  TradeProposalModal,
  useGondolaParams,
  filterGondolaPackages,
  DEFAULT_CARD_VARIANT,
  type CardVariant,
  type GondolaPackage,
} from "@/features/barter";
import type { ProductPackage } from "@myself/shared";

/**
 * How many cards the list draws before the operator scrolls.
 *
 * The gondola carries 1531 packages (four POC packs plus every printed product),
 * so only a screenful is mounted up front and the rest follows while scrolling:
 * rendering all of them froze the screen and defeated the search.
 */
const INITIAL_PACKAGES = 8;
const PACKAGES_PER_BATCH = 8;
/**
 * How many viewports of rows stay mounted, counted from the visible one. Seven
 * keeps the scroll back and forward immediate without holding a thousand cards
 * alive, which is what a plain scroll view did.
 */
const GONDOLA_WINDOW_SIZE = 7;

/** FlatList asks repeatedly: the package id is the row identity. */
const gondolaKeyExtractor = (pkg: GondolaPackage) => pkg.id;

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
    matches,
    productionTypeFilter,
    maxDistanceKm,
    setActiveProducer,
    setProductionTypeFilter,
    setMaxDistanceKm,
    createTradeProposal,
    resetToSeed,
  } = useBarter();

  const [query, setQuery] = useState("");
  // Which of the two validation layouts the gondola draws. It lives beside the
  // filters because it is part of the gondola view: `useGondolaParams` carries it
  // into the address, so the choice survives a reload and can be shared as a link.
  const [cardVariant, setCardVariant] =
    useState<CardVariant>(DEFAULT_CARD_VARIANT);
  const [selectedTargetPackage, setSelectedTargetPackage] =
    useState<ProductPackage | null>(null);

  // The gondola view lives in the URL: the address reproduces the page and the
  // browser back button reverts a search, because a search that starts pushes one
  // history entry instead of hiding in component state.
  useGondolaParams({
    query,
    productionType: productionTypeFilter ?? "ALL",
    maxDistanceKm,
    cardVariant,
    activeProducerId: activeProducer?.id,
    onApply: (state) => {
      setQuery(state.query);
      setProductionTypeFilter(state.productionType);
      setMaxDistanceKm(state.maxDistanceKm);
      setCardVariant(state.cardVariant);
    },
  });

  // Proposals waiting on the active producer's decision.
  const actionableCount =
    incomingMatches.filter((m) => m.status === "PENDING").length +
    outgoingMatches.filter((m) => m.status === "COUNTER_OFFERED").length;

  // The search and the two chip filters narrow the same list, so the header count
  // and the empty state always describe what is on screen.
  const visiblePackages = useMemo(
    () => filterGondolaPackages(gondolaPackages, query),
    [gondolaPackages, query],
  );

  // Asked once per render instead of once per row: a thousand cards would
  // otherwise rescan every outgoing proposal each time they mount.
  const pendingPackageIds = useMemo(
    () =>
      new Set(
        outgoingMatches
          .filter(
            (m) => m.status === "PENDING" || m.status === "COUNTER_OFFERED",
          )
          .map((m) => m.targetPackageId),
      ),
    [outgoingMatches],
  );

  const handleOpenProposal = useCallback((pkg: ProductPackage) => {
    setSelectedTargetPackage(pkg);
  }, []);

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

  const renderPackage = useCallback(
    ({ item }: { item: GondolaPackage }) => (
      <ProductPackageCard
        packageItem={item}
        variant={cardVariant}
        hasPendingProposal={pendingPackageIds.has(item.id)}
        onProposeTrade={handleOpenProposal}
      />
    ),
    [pendingPackageIds, handleOpenProposal, cardVariant],
  );

  const targetProducer = producers.find(
    (p) => p.id === selectedTargetPackage?.producerId,
  );

  const trimmedQuery = query.trim();

  // Everything above the list is its header, so the producer switcher, the inbox,
  // the filters and the count scroll with the gondola instead of being a second
  // scrollable layer on top of it. The search field is the exception: it is
  // pinned above the list (see `fixedHeader` below), because a field that scrolls
  // is a field the software keyboard can cover.
  const listHeader = (
    <View style={styles.listHeader}>
      {/* Producer identity header and multi-tab switcher */}
      <ProducerHeaderSwitcher
        activeProducer={activeProducer}
        producers={producers}
        papConfigArs={papConfigArs}
        matches={matches}
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

      {/* Filter bar: production type, distance and the card layout under test */}
      <GondolaFilterBar
        selectedType={productionTypeFilter}
        onSelectType={setProductionTypeFilter}
        maxDistanceKm={maxDistanceKm}
        onSelectMaxDistance={setMaxDistanceKm}
        cardVariant={cardVariant}
        onSelectCardVariant={setCardVariant}
      />

      <View style={styles.sectionHeader}>
        <ThemedText variant="title2" style={styles.sectionTitle}>
          Góndola de Productores ({visiblePackages.length})
        </ThemedText>
        <ThemedText variant="caption1" style={styles.sectionSubtitle}>
          Seleccioná un producto para proponer un trueque exacto de 1 PAP
        </ThemedText>
      </View>
    </View>
  );

  return (
    <>
      {/* Virtualised: 1531 packages cannot be a `map` inside a scroll view. The
          container owns the safe area, the gutter and the software keyboard, so
          the list is the screen's root the way `ScreenContainer.Scroll` is
          elsewhere. `edges` is bottom only: the stack header above this screen
          already owns the status bar, and insetting for it again spent ~56dp of
          a phone screen on nothing. */}
      <ScreenContainer.List
        edges={["bottom"]}
        // The gutter belongs to the rows, not to the container: the switcher, the
        // filter bar, the search row and the card each carry `spacing.md`, so the
        // container's default padding added a second inset on top of theirs and
        // charged the cards 12px per side for nothing. Zero here and the 16 of the
        // rows is the whole gutter, which is also what keeps every element aligned.
        horizontalPadding={0}
        data={visiblePackages}
        keyExtractor={gondolaKeyExtractor}
        renderItem={renderPackage}
        fixedHeader={
          <View style={styles.searchRow}>
            {/* The field is on screen by construction, whatever the keyboard
                does: nothing covers it, so nothing has to dock it. */}
            <GondolaSearch value={query} onChangeText={setQuery} />
          </View>
        }
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <EmptyState
            icon="sf:cart"
            title={
              trimmedQuery
                ? "Ningún producto coincide"
                : "No hay productos disponibles"
            }
            description={
              trimmedQuery
                ? `No encontramos “${trimmedQuery}” en el nombre de un producto ni en el de un productor. Probá con otra palabra o limpiá la búsqueda.`
                : "Probá cambiar los filtros de certificación o de distancia para ver productos de otros productores."
            }
            style={styles.emptyState}
          />
        }
        // The container owns the whole safe area, the gutter and the keyboard
        // reservation, exactly like `ScreenContainer.Scroll` does for scrolling
        // screens.
        initialNumToRender={INITIAL_PACKAGES}
        maxToRenderPerBatch={PACKAGES_PER_BATCH}
        windowSize={GONDOLA_WINDOW_SIZE}
        showsVerticalScrollIndicator={false}
        testID="gondola-list"
      />

      {/* Proposal initiation modal. The modal keeps its preselection in state
          initialized once, so it is keyed on the identity it belongs to: a new
          active producer or a new target package remounts it and preselection
          resets, instead of keeping the previous producer's package id. */}
      <TradeProposalModal
        key={`${activeProducer?.id ?? "none"}:${selectedTargetPackage?.id ?? "none"}`}
        visible={!!selectedTargetPackage}
        targetPackage={selectedTargetPackage}
        targetProducerName={targetProducer?.name}
        availableOwnPackages={activeProducerPackages}
        onConfirmProposal={handleConfirmProposal}
        onClose={() => setSelectedTargetPackage(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  listHeader: {
    gap: layout.cardGap,
  },
  inboxRow: {
    marginHorizontal: spacing.md,
  },
  searchRow: {
    marginHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  sectionHeader: {
    marginHorizontal: spacing.md,
  },
  sectionTitle: {
    color: colors.label,
    fontWeight: fontWeights.bold,
  },
  sectionSubtitle: {
    color: colors.secondaryLabel,
    marginTop: spacing.xxs,
  },
  emptyState: {
    marginVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
});
