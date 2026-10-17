import React from "react";
import { View, StyleSheet } from "react-native";
import { Card, ThemedText, AppButton, Badge } from "@/components";
import { colors, fontWeights, spacing, radius } from "@/theme";
import type {
  Producer,
  ProductPackage,
  TradeMatch,
  TradeMatchStatus,
} from "@myself/shared";
import { getMatchActionAvailability, type TradeRole } from "../inbox-utils";

const STATUS_DISPLAY: Record<
  TradeMatchStatus,
  {
    label: string;
    variant: "primary" | "success" | "neutral" | "warning" | "destructive";
  }
> = {
  PENDING: { label: "Pendiente", variant: "warning" },
  COUNTER_OFFERED: { label: "Contraoferta", variant: "primary" },
  ACCEPTED: { label: "Aceptado", variant: "success" },
  WAITING_DELIVERY: { label: "Entrega en curso", variant: "primary" },
  COMPLETED: { label: "Completado", variant: "success" },
  REJECTED: { label: "Rechazado", variant: "destructive" },
  EXPIRED: { label: "Expirado", variant: "neutral" },
  CANCELLED_INSUFFICIENT_STOCK: {
    label: "Cancelado (sin stock)",
    variant: "neutral",
  },
  CANCELLED_BY_PRODUCER: { label: "Cancelado", variant: "neutral" },
};

interface TradeMatchCardProps {
  match: TradeMatch;
  role: TradeRole;
  otherProducer: Producer | undefined;
  offeredPackage: ProductPackage | undefined;
  targetPackage: ProductPackage | undefined;
  onAccept: (matchId: string) => void;
  onReject: (matchId: string) => void;
  onCounterOffer: (match: TradeMatch) => void;
  onOpenTrade?: (matchId: string) => void;
}

export function TradeMatchCard({
  match,
  role,
  otherProducer,
  offeredPackage,
  targetPackage,
  onAccept,
  onReject,
  onCounterOffer,
  onOpenTrade,
}: TradeMatchCardProps) {
  const actions = getMatchActionAvailability(match.status, role);
  const statusDisplay = STATUS_DISPLAY[match.status];
  const hasActions =
    actions.canAccept || actions.canReject || actions.canCounterOffer;

  const isActiveProposal =
    match.status === "PENDING" || match.status === "COUNTER_OFFERED";
  const expiresLabel = isActiveProposal
    ? `Vence ${new Date(match.expiresAt).toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })}`
    : null;

  return (
    <Card variant="subdued" style={styles.card}>
      {/* Header: counterpart + status */}
      <View style={styles.headerRow}>
        <ThemedText variant="headline" style={styles.counterpart}>
          {role === "target" ? "De: " : "Para: "}
          {otherProducer?.name ?? "Productor desconocido"}
        </ThemedText>
        <Badge
          label={statusDisplay.label}
          variant={statusDisplay.variant}
          size="sm"
        />
      </View>

      {/* Exchange summary */}
      <View style={styles.exchangeRow}>
        <View style={styles.exchangeSide}>
          <ThemedText variant="caption1" style={styles.exchangeLabel}>
            {role === "target" ? "TE OFRECEN" : "OFRECÉS"}
          </ThemedText>
          <ThemedText variant="callout" style={styles.exchangeTitle}>
            {offeredPackage?.title ?? "Paquete no disponible"}
          </ThemedText>
        </View>
        <ThemedText variant="title2" style={styles.exchangeArrow}>
          ⇄
        </ThemedText>
        <View style={styles.exchangeSide}>
          <ThemedText variant="caption1" style={styles.exchangeLabel}>
            {role === "target" ? "PIDEN DE VOS" : "PEDÍS"}
          </ThemedText>
          <ThemedText variant="callout" style={styles.exchangeTitle}>
            {targetPackage?.title ?? "Paquete no disponible"}
          </ThemedText>
        </View>
      </View>

      <View style={styles.badgeRow}>
        <Badge
          label={`${match.totalPap} PAP ($${match.papSnapshotArs.toLocaleString("es-AR")})`}
          variant="outline"
          size="sm"
        />
        {expiresLabel ? (
          <ThemedText variant="caption1" style={styles.expiry}>
            {expiresLabel}
          </ThemedText>
        ) : null}
      </View>

      {/* Counter-offer history note */}
      {match.counterOfferHistory ? (
        <ThemedText variant="caption1" style={styles.counterNote}>
          🔄 Contraoferta: antes se ofrecía &quot;
          {offeredPackage?.id ===
          match.counterOfferHistory.previousOfferedPackageId
            ? offeredPackage.title
            : match.counterOfferHistory.previousOfferedPackageId}
          &quot;.
        </ThemedText>
      ) : null}

      {/* Delivery state (handshake detail lives in the trade screen) */}
      {match.status === "WAITING_DELIVERY" ? (
        <ThemedText variant="caption1" style={styles.deliveryNote}>
          📦 Entrega en curso — confirmada por:{" "}
          {[
            match.deliveryConfirmation.confirmedByRequester
              ? "solicitante"
              : null,
            match.deliveryConfirmation.confirmedByTarget ? "receptor" : null,
          ]
            .filter(Boolean)
            .join(" y ") || "nadie todavía"}
          .
        </ThemedText>
      ) : null}

      {/* Turn indicator */}
      {actions.awaitingResponseFrom ? (
        <ThemedText variant="caption1" style={styles.waitingNote}>
          ⏳ Esperando respuesta de la otra parte.
        </ThemedText>
      ) : null}

      {/* Delivery entry point */}
      {match.status === "WAITING_DELIVERY" && onOpenTrade ? (
        <View style={styles.actionsRow}>
          <AppButton
            title="Coordinar entrega"
            variant="primary"
            onPress={() => onOpenTrade(match.id)}
            style={styles.actionBtn}
          />
        </View>
      ) : null}

      {/* Actions */}
      {hasActions ? (
        <View style={styles.actionsRow}>
          {actions.canReject ? (
            <AppButton
              title="Rechazar"
              variant="secondary"
              onPress={() => onReject(match.id)}
              style={styles.actionBtn}
            />
          ) : null}
          {actions.canCounterOffer ? (
            <AppButton
              title="Contraofertar"
              variant="secondary"
              onPress={() => onCounterOffer(match)}
              style={styles.actionBtn}
            />
          ) : null}
          {actions.canAccept ? (
            <AppButton
              title="Aceptar"
              variant="primary"
              onPress={() => onAccept(match.id)}
              style={styles.actionBtn}
            />
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.secondarySystemBackground,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  counterpart: {
    color: colors.label,
    flex: 1,
  },
  exchangeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  exchangeSide: {
    flex: 1,
  },
  exchangeLabel: {
    color: colors.secondaryLabel,
    fontWeight: fontWeights.bold,
  },
  exchangeTitle: {
    color: colors.label,
    marginTop: spacing.xxs,
  },
  exchangeArrow: {
    color: colors.secondaryLabel,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  expiry: {
    color: colors.secondaryLabel,
  },
  counterNote: {
    color: colors.secondaryLabel,
    fontStyle: "italic",
  },
  deliveryNote: {
    color: colors.secondaryLabel,
  },
  waitingNote: {
    color: colors.secondaryLabel,
  },
  actionsRow: {
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  actionBtn: {
    flex: 1,
  },
});
