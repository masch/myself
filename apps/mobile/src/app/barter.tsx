import React, { useCallback, useMemo, useState } from "react";
import { View, StyleSheet, FlatList, Platform } from "react-native";
import { router } from "expo-router";
import {
  ScreenContainer,
  EmptyState,
  ThemedText,
  AppButton,
  useToast,
} from "@/components";
import { colors, fontWeights, layout, spacing } from "@/theme";
import { useKeyboardInset } from "@/hooks/use-keyboard-inset";
import {
  useBarter,
  ProducerHeaderSwitcher,
  ProductPackageCard,
  GondolaFilterBar,
  GondolaSearch,
  TradeProposalModal,
  useGondolaParams,
  filterGondolaPackages,
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
  const [selectedTargetPackage, setSelectedTargetPackage] =
    useState<ProductPackage | null>(null);

  // The gondola view lives in the URL: the address reproduces the page and the
  // browser back button reverts a search, because a search that starts pushes one
  // history entry instead of hiding in component state.
  useGondolaParams({
    query,
    productionType: productionTypeFilter ?? "ALL",
    maxDistanceKm,
    activeProducerId: activeProducer?.id,
    onApply: (state) => {
      setQuery(state.query);
      setProductionTypeFilter(state.productionType);
      setMaxDistanceKm(state.maxDistanceKm);
    },
  });

  // The gondola scrolls its own virtualised list instead of using
  // `ScreenContainer.Scroll`, so it reserves the software keyboard itself. On web
  // nothing else does it: the browser keeps the layout viewport at full height and
  // the keyboard covers the field plus every result under it.
  const keyboardInset = useKeyboardInset();

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
        hasPendingProposal={pendingPackageIds.has(item.id)}
        onProposeTrade={handleOpenProposal}
      />
    ),
    [pendingPackageIds, handleOpenProposal],
  );

  const targetProducer = producers.find(
    (p) => p.id === selectedTargetPackage?.producerId,
  );

  const trimmedQuery = query.trim();

  // While a search is active the producer card and the inbox step aside: on a
  // phone browser they push the field behind the keyboard, which is exactly where
  // the results have to appear.
  //
  // Keyed on the query and not on focus, on purpose. Collapsing on focus made the
  // layout jump on every blur — including the blur a press on the ✕ causes — and
  // the button was remounted between pointerdown and pointerup, so its handler
  // never ran. A stable header while a search exists is worth the one jump on the
  // first character.
  //
  // Web only: native resizes the window with the keyboard and the field is already
  // reachable, so the native screen keeps the layout it had.
  const isCompactSearch = Platform.OS === "web" && trimmedQuery.length > 0;

  // Everything above the list is its header, so the producer switcher, the inbox,
  // the filters and the count scroll with the gondola instead of being a second
  // scrollable layer on top of it.
  const listHeader = (
    <View style={styles.listHeader}>
      {/* Producer identity header and multi-tab switcher */}
      {!isCompactSearch && (
        <ProducerHeaderSwitcher
          activeProducer={activeProducer}
          producers={producers}
          papConfigArs={papConfigArs}
          matches={matches}
          onSelectProducer={setActiveProducer}
          onResetSeed={resetToSeed}
        />
      )}

      {/* Inbox entry point */}
      {!isCompactSearch && (
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
      )}

      {/* Filter bar: production type and distance */}
      <GondolaFilterBar
        selectedType={productionTypeFilter}
        onSelectType={setProductionTypeFilter}
        maxDistanceKm={maxDistanceKm}
        onSelectMaxDistance={setMaxDistanceKm}
      />

      {/* Search over product and producer name, composing with the chips above */}
      <View style={styles.searchRow}>
        <GondolaSearch value={query} onChangeText={setQuery} />
      </View>

      <View style={styles.sectionHeader}>
        <ThemedText variant="title2" style={styles.sectionTitle}>
          Góndola de Productores ({visiblePackages.length})
        </ThemedText>
        {!isCompactSearch && (
          <ThemedText variant="caption1" style={styles.sectionSubtitle}>
            Seleccioná un producto para proponer un trueque exacto de 1 PAP
          </ThemedText>
        )}
      </View>
    </View>
  );

  return (
    <ScreenContainer edges={["top", "bottom"]} style={styles.container}>
      {/* Virtualised: 1531 packages cannot be a `map` inside a scroll view. */}
      <FlatList
        data={visiblePackages}
        keyExtractor={gondolaKeyExtractor}
        renderItem={renderPackage}
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
        style={styles.list}
        // The screen container owns the safe-area insets; the list keeps the
        // gutter every other screen gets from the scroll container it replaced,
        // so the gondola does not sit 12dp wider than the rest of the app.
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: keyboardInset },
        ]}
        initialNumToRender={INITIAL_PACKAGES}
        maxToRenderPerBatch={PACKAGES_PER_BATCH}
        windowSize={GONDOLA_WINDOW_SIZE}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
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
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.systemBackground,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: layout.screenHorizontalPadding,
  },
  listHeader: {
    gap: layout.cardGap,
  },
  inboxRow: {
    marginHorizontal: spacing.md,
  },
  searchRow: {
    marginHorizontal: spacing.md,
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
