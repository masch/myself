import { useState } from "react";
import { View, Text, TextInput, StyleSheet, Pressable } from "react-native";
import { colors } from "@/theme/colors";
import { AppButton, AppBottomSheetModal } from "@/components";

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
        <Text style={[styles.title, { color: colors.label }]}>
          Saltear pregunta
        </Text>

        <Text
          style={[styles.promptPreview, { color: colors.secondaryLabel }]}
          numberOfLines={2}
        >
          {`"${promptText}"`}
        </Text>

        <Text style={[styles.infoNote, { color: colors.secondaryLabel }]}>
          Saltear te permite avanzar y registrar tu motivo. Podés responderla
          más adelante dentro de la ventana de gracia.
        </Text>

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
              <Text
                style={[
                  styles.chipText,
                  {
                    color: reason === preset ? colors.white : colors.label,
                  },
                ]}
              >
                {preset}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Reason Input */}
        <TextInput
          style={[
            styles.input,
            {
              color: colors.label,
              backgroundColor: colors.systemBackground,
              borderColor: colors.systemGray15,
            },
          ]}
          placeholder="Escribí el motivo del salteo..."
          placeholderTextColor={colors.secondaryLabel}
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
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  promptPreview: {
    fontSize: 14,
    fontStyle: "italic",
    marginBottom: 10,
  },
  infoNote: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "500",
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 20,
    width: "100%",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
  },
});
