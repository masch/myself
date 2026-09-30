import { useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { colors, spacing, radius } from "@/theme";
import {
  AppButton,
  AppBottomSheetModal,
  ThemedText,
  ThemedTextInput,
} from "@/components";

interface SkipReasonSheetProps {
  visible: boolean;
  promptText: string;
  onConfirm: (reason: string) => Promise<void> | void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const QUICK_REASONS = [
  "Sin novedades hoy",
  "Falta de tiempo",
  "Prefiero responder luego",
];

export function SkipReasonSheet({
  visible,
  promptText,
  onConfirm,
  onCancel,
  isSubmitting = false,
}: SkipReasonSheetProps) {
  const [reason, setReason] = useState("");

  const handleSelectQuickReason = (text: string) => {
    setReason(text);
  };

  const handleConfirm = async () => {
    if (reason.trim().length === 0) return;
    try {
      await onConfirm(reason.trim());
      setReason("");
    } catch {
      // Retain reason on submission failure so user input is not lost
    }
  };

  const handleClose = () => {
    setReason("");
    onCancel();
  };

  return (
    <AppBottomSheetModal visible={visible} onClose={handleClose} maxWidth={580}>
      <View style={styles.content}>
        <ThemedText
          variant="headline"
          color={colors.label}
          style={styles.title}
        >
          Saltear pregunta
        </ThemedText>

        <ThemedText
          variant="callout"
          color={colors.secondaryLabel}
          style={styles.promptPreview}
          numberOfLines={2}
        >
          {`"${promptText}"`}
        </ThemedText>

        <ThemedText
          variant="caption1"
          color={colors.secondaryLabel}
          style={styles.infoNote}
        >
          Saltear te permite avanzar y registrar tu motivo. Podés responderla
          más adelante dentro de la ventana de gracia.
        </ThemedText>

        {/* Quick suggestions */}
        <View style={styles.chipsRow}>
          {QUICK_REASONS.map((preset) => (
            <Pressable
              key={preset}
              accessibilityRole="button"
              onPress={() => handleSelectQuickReason(preset)}
              style={[
                styles.chip,
                {
                  backgroundColor:
                    reason === preset ? colors.systemBlue : colors.systemGray15,
                },
              ]}
            >
              <ThemedText
                variant="caption1"
                color={reason === preset ? colors.white : colors.label}
                style={styles.chipText}
              >
                {preset}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        {/* Reason Input */}
        <ThemedTextInput
          style={styles.input}
          placeholder="Escribí el motivo del salteo..."
          value={reason}
          onChangeText={setReason}
          multiline
          numberOfLines={3}
        />

        <View style={styles.actionsRow}>
          <View style={{ flex: 1 }}>
            <AppButton
              title="Cancelar"
              variant="secondary"
              onPress={handleClose}
              disabled={isSubmitting}
            />
          </View>
          <View style={{ flex: 1 }}>
            <AppButton
              title={isSubmitting ? "Salteando..." : "Saltear"}
              variant="destructive"
              onPress={handleConfirm}
              disabled={reason.trim().length === 0 || isSubmitting}
            />
          </View>
        </View>
      </View>
    </AppBottomSheetModal>
  );
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
  },
  title: {
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  promptPreview: {
    fontStyle: "italic",
    marginBottom: spacing.sm + 2,
  },
  infoNote: {
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md - 2,
  },
  chip: {
    paddingHorizontal: spacing.md - 4,
    paddingVertical: spacing.xs + 3,
    borderRadius: radius.lg,
  },
  chipText: {
    fontWeight: "500",
  },
  input: {
    marginBottom: spacing.lg - 4,
    width: "100%",
  },
  actionsRow: {
    flexDirection: "row",
    gap: spacing.md - 4,
  },
});
