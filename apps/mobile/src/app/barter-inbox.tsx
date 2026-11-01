import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { router } from "expo-router";
import {
  ScreenContainer,
  EmptyState,
  ThemedText,
  useToast,
} from "@/components";
import { colors, spacing } from "@/theme";
import {
  useBarter,
  ProducerHeaderSwitcher,
  TradeMatchCard,
  CounterOfferModal,
  getCounterOfferCandidates,
} from "@/features/barter";
import type { TradeMatch } from "@myself/shared";

export default function BarterInboxScreen() {
  const toast = useToast();
  const {
    activeProducer,
    producers,
    packages,
    papConfigArs,
    incomingMatches,
    outgoingMatches,
    matches,
    setActiveProducer,
    acceptTradeMatch,
    rejectTradeMatch,
    counterOfferTradeMatch,
    checkExpiredMatches,
    resetToSeed,
  } = useBarter();

  const [counterOfferMatch, setCounterOfferMatch] = useState<TradeMatch | null>(
    null,
  );

  // Evaluate TTL on mount so stale proposals surface as EXPIRED.
  useEffect(() => {
    checkExpiredMatches();
  }, [checkExpiredMatches]);

  const findProducer = (id: string) => producers.find((p) => p.id === id);
  const findPackage = (id: string) => packages.find((p) => p.id === id);

  const handleAccept = (matchId: string) => {
    try {
      acceptTradeMatch(matchId);
      toast.success("¡Trueque aceptado! El stock quedó reservado.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "No se pudo aceptar el trueque",
      );
    }
  };

  const handleReject = (matchId: string) => {
    if (!activeProducer) return;

    try {
      rejectTradeMatch(matchId, activeProducer.id);
      toast.success("Propuesta rechazada.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "No se pudo rechazar la propuesta",
      );
    }
  };

  const handleConfirmCounterOffer = (counterOfferedPackageId: string) => {
    if (!counterOfferMatch || !activeProducer) return;

    try {
      counterOfferTradeMatch({
        matchId: counterOfferMatch.id,
        targetProducerId: activeProducer.id,
        counterOfferedPackageId,
      });
      toast.success("Contraoferta enviada. Esperando respuesta.");
      setCounterOfferMatch(null);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "No se pudo enviar la contraoferta",
      );
    }
  };

  const sortByUpdatedDesc = (a: TradeMatch, b: TradeMatch) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();

  const handleOpenTrade = (matchId: string) => {
    router.push(`/barter-trade/${matchId}`);
  };

  const sortedIncoming = [...incomingMatches].sort(sortByUpdatedDesc);
  const sortedOutgoing = [...outgoingMatches].sort(sortByUpdatedDesc);

  return (
    <ScreenContainer.Scroll edges={["top", "bottom"]} style={styles.container}>
      <ProducerHeaderSwitcher
        activeProducer={activeProducer}
        producers={producers}
        papConfigArs={papConfigArs}
        matches={matches}
        onSelectProducer={setActiveProducer}
        onResetSeed={resetToSeed}
      />

      {/* Received proposals */}
      <ThemedText variant="title2" style={styles.sectionTitle}>
        Recibidos
      </ThemedText>
      {sortedIncoming.length === 0 ? (
        <EmptyState
          icon="tray"
          title="Sin propuestas recibidas"
          description="Cuando otro productor te proponga un trueque, va a aparecer acá."
        />
      ) : (
        <View style={styles.sectionBody}>
          {sortedIncoming.map((match) => (
            <TradeMatchCard
              key={match.id}
              match={match}
              role="target"
              otherProducer={findProducer(match.requesterId)}
              offeredPackage={findPackage(match.offeredPackageId)}
              targetPackage={findPackage(match.targetPackageId)}
              onAccept={handleAccept}
              onReject={handleReject}
              onCounterOffer={setCounterOfferMatch}
              onOpenTrade={handleOpenTrade}
            />
          ))}
        </View>
      )}

      {/* Sent proposals */}
      <ThemedText variant="title2" style={styles.sectionTitle}>
        Enviados
      </ThemedText>
      {sortedOutgoing.length === 0 ? (
        <EmptyState
          icon="paperplane"
          title="Sin propuestas enviadas"
          description="Proponé un trueque desde la góndola para verlo acá."
        />
      ) : (
        <View style={styles.sectionBody}>
          {sortedOutgoing.map((match) => (
            <TradeMatchCard
              key={match.id}
              match={match}
              role="requester"
              otherProducer={findProducer(match.targetProducerId)}
              offeredPackage={findPackage(match.offeredPackageId)}
              targetPackage={findPackage(match.targetPackageId)}
              onAccept={handleAccept}
              onReject={handleReject}
              onCounterOffer={setCounterOfferMatch}
              onOpenTrade={handleOpenTrade}
            />
          ))}
        </View>
      )}

      {/* Counter-offer modal. Same one-time preselection as the proposal
          modal, so it is keyed on the match it is showing and resets when a
          different match opens it. */}
      <CounterOfferModal
        key={counterOfferMatch?.id ?? "none"}
        visible={!!counterOfferMatch}
        match={counterOfferMatch}
        currentOfferedPackage={
          counterOfferMatch
            ? findPackage(counterOfferMatch.offeredPackageId)
            : undefined
        }
        candidates={
          counterOfferMatch
            ? getCounterOfferCandidates(packages, counterOfferMatch)
            : []
        }
        onConfirm={handleConfirmCounterOffer}
        onClose={() => setCounterOfferMatch(null)}
      />
    </ScreenContainer.Scroll>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.systemBackground,
  },
  sectionTitle: {
    color: colors.label,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  sectionBody: {
    marginBottom: spacing.sm,
  },
});
