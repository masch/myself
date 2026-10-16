import React from "react";
import { View, StyleSheet, Linking } from "react-native";
import { useLocalSearchParams } from "expo-router";
import {
  ScreenContainer,
  EmptyState,
  ThemedText,
  AppButton,
  Card,
  Badge,
  useToast,
} from "@/components";
import { colors, spacing, radius } from "@/theme";
import {
  useBarter,
  getTradeRole,
  buildTradeCoordinationMessage,
  buildWhatsAppTradeUrl,
} from "@/features/barter";

export default function BarterTradeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const {
    activeProducer,
    producers,
    packages,
    matches,
    confirmDelivery,
    cancelTradeMatch,
  } = useBarter();

  const match = matches.find((m) => m.id === id);

  if (!match || !activeProducer) {
    return (
      <ScreenContainer.Scroll
        edges={["top", "bottom"]}
        style={styles.container}
      >
        <EmptyState
          icon="exclamationmark.triangle"
          title="Trueque no encontrado"
          description="El trueque pudo haberse cancelado o el enlace es inválido."
        />
      </ScreenContainer.Scroll>
    );
  }

  const role = getTradeRole(match, activeProducer.id);
  const requester = producers.find((p) => p.id === match.requesterId);
  const target = producers.find((p) => p.id === match.targetProducerId);
  const counterpart = role === "requester" ? target : requester;
  const offeredPackage = packages.find((p) => p.id === match.offeredPackageId);
  const targetPackage = packages.find((p) => p.id === match.targetPackageId);

  const isWaitingDelivery = match.status === "WAITING_DELIVERY";
  const isCompleted = match.status === "COMPLETED";
  const myConfirmation =
    role === "requester"
      ? match.deliveryConfirmation.confirmedByRequester
      : match.deliveryConfirmation.confirmedByTarget;
  const counterpartConfirmation =
    role === "requester"
      ? match.deliveryConfirmation.confirmedByTarget
      : match.deliveryConfirmation.confirmedByRequester;

  const handleOpenWhatsApp = async () => {
    if (!counterpart) return;
    const url = buildWhatsAppTradeUrl(
      counterpart.phone,
      buildTradeCoordinationMessage({
        counterpartName: counterpart.name,
        offeredTitle: offeredPackage?.title ?? match.offeredPackageId,
        targetTitle: targetPackage?.title ?? match.targetPackageId,
      }),
    );
    try {
      await Linking.openURL(url);
    } catch {
      toast.error("No se pudo abrir WhatsApp en este dispositivo");
    }
  };

  const handleConfirmDelivery = () => {
    try {
      const updated = confirmDelivery(match.id, activeProducer.id);
      if (updated.status === "COMPLETED") {
        toast.success("¡Trueque completado! Ambas partes confirmaron.");
      } else {
        toast.success("Recepción confirmada. Falta la otra parte.");
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "No se pudo confirmar la entrega",
      );
    }
  };

  const handleCancel = () => {
    try {
      cancelTradeMatch(match.id, activeProducer.id);
      toast.success("Trueque cancelado. El stock reservado fue devuelto.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "No se pudo cancelar el trueque",
      );
    }
  };

  return (
    <ScreenContainer.Scroll edges={["top", "bottom"]} style={styles.container}>
      {/* Exchange summary */}
      <Card variant="subdued" style={styles.card}>
        <View style={styles.statusRow}>
          <ThemedText variant="title2" style={styles.title}>
            Trueque 1:1 en PAP
          </ThemedText>
          <Badge
            label={
              isCompleted
                ? "Completado"
                : isWaitingDelivery
                  ? "Entrega en curso"
                  : match.status
            }
            variant={isCompleted ? "success" : "primary"}
            size="sm"
          />
        </View>

        <View style={styles.exchangeRow}>
          <View style={styles.exchangeSide}>
            <ThemedText variant="caption1" style={styles.exchangeLabel}>
              {requester?.name ?? "Solicitante"} ENTREGA
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
              {target?.name ?? "Receptor"} ENTREGA
            </ThemedText>
            <ThemedText variant="callout" style={styles.exchangeTitle}>
              {targetPackage?.title ?? "Paquete no disponible"}
            </ThemedText>
          </View>
        </View>

        <Badge
          label={`${match.totalPap} PAP ($${match.papSnapshotArs.toLocaleString("es-AR")})`}
          variant="outline"
          size="sm"
        />
      </Card>

      {/* WhatsApp coordination */}
      {isWaitingDelivery && counterpart ? (
        <Card variant="subdued" style={styles.card}>
          <ThemedText variant="headline" style={styles.sectionTitle}>
            Coordinación de entrega
          </ThemedText>
          <ThemedText variant="caption1" style={styles.sectionText}>
            Coordiná día, hora y lugar directamente con {counterpart.name} por
            WhatsApp.
          </ThemedText>
          <AppButton
            title="Abrir WhatsApp"
            variant="primary"
            onPress={handleOpenWhatsApp}
          />
        </Card>
      ) : null}

      {/* Dual delivery confirmation */}
      {isWaitingDelivery ? (
        <Card variant="subdued" style={styles.card}>
          <ThemedText variant="headline" style={styles.sectionTitle}>
            Confirmación de recepción
          </ThemedText>
          <View style={styles.confirmationRow}>
            <ThemedText variant="callout" style={styles.confirmationText}>
              {myConfirmation ? "✅" : "⬜"} Vos confirmaste recepción
            </ThemedText>
            <ThemedText variant="callout" style={styles.confirmationText}>
              {counterpartConfirmation ? "✅" : "⬜"}{" "}
              {counterpart?.name ?? "La otra parte"} confirmó
            </ThemedText>
          </View>
          {!myConfirmation ? (
            <AppButton
              title="Confirmar que recibí mi producto"
              variant="primary"
              onPress={handleConfirmDelivery}
            />
          ) : (
            <ThemedText variant="caption1" style={styles.sectionText}>
              Esperando que la otra parte confirme para completar el trueque.
            </ThemedText>
          )}
          <AppButton
            title="Cancelar trueque (devuelve stock)"
            variant="secondary"
            onPress={handleCancel}
          />
        </Card>
      ) : null}

      {/* Completed state */}
      {isCompleted ? (
        <Card variant="subdued" style={styles.card}>
          <ThemedText variant="headline" style={styles.completedText}>
            🎉 Trueque completado. ¡Gracias por intercambiar sin intermediarios!
          </ThemedText>
        </Card>
      ) : null}
    </ScreenContainer.Scroll>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.systemBackground,
  },
  card: {
    backgroundColor: colors.secondarySystemBackground,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  title: {
    color: colors.label,
    fontWeight: "700",
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
    fontWeight: "700",
  },
  exchangeTitle: {
    color: colors.label,
    marginTop: 2,
  },
  exchangeArrow: {
    color: colors.secondaryLabel,
  },
  sectionTitle: {
    color: colors.label,
  },
  sectionText: {
    color: colors.secondaryLabel,
  },
  confirmationRow: {
    gap: spacing.xs,
  },
  confirmationText: {
    color: colors.label,
  },
  completedText: {
    color: colors.systemGreen,
    textAlign: "center",
  },
});
