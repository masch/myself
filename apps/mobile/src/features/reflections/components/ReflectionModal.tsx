import { useState } from "react";
import { View, StyleSheet } from "react-native";
import { type ReflectionQuestion } from "@myself/shared";
import { colors, spacing } from "@/theme";
import {
  AppButton,
  AppBottomSheetModal,
  AppMarkdownText,
  Badge,
  ThemedText,
  ThemedTextInput,
} from "@/components";
import { ScaleSelector1To10 } from "./ScaleSelector1To10";

interface ReflectionModalProps {
  visible: boolean;
  question: ReflectionQuestion | null;
  initialContent?: string;
  initialNumericValue?: number;
  onSave: (input: { content?: string; numericValue?: number }) => void;
  onClose: () => void;
  isSubmitting?: boolean;
}

export function ReflectionModalContent({
  question,
  initialContent = "",
  initialNumericValue = null,
  onSave,
  onClose,
  isSubmitting = false,
}: {
  question: ReflectionQuestion;
  initialContent?: string;
  initialNumericValue?: number | null;
  onSave: (input: { content?: string; numericValue?: number }) => void;
  onClose: () => void;
  isSubmitting?: boolean;
}) {
  const [content, setContent] = useState(initialContent);
  const [numericValue, setNumericValue] = useState<number | null>(
    initialNumericValue,
  );

  const isText = question.responseType === "text";
  const isValid = isText
    ? content.trim().length > 0
    : numericValue !== null && numericValue >= 1 && numericValue <= 10;

  const handleSave = () => {
    if (!isValid) return;
    onSave({
      content: isText ? content.trim() : undefined,
      numericValue: !isText && numericValue !== null ? numericValue : undefined,
    });
  };

  return (
    <View style={styles.content}>
      <View style={styles.badgeRow}>
        <Badge
          variant="neutral"
          label={isText ? "Reflexión Libre" : "Puntaje 1 al 10"}
        />
      </View>

      <AppMarkdownText style={[styles.promptText, { color: colors.label }]}>
        {question.prompt}
      </AppMarkdownText>

      {isText ? (
        <View style={styles.inputContainer}>
          <ThemedTextInput
            autoFocus
            style={styles.textInput}
            placeholder="Escribí tu respuesta con honestidad..."
            value={content}
            onChangeText={setContent}
            multiline
            numberOfLines={5}
          />
          <ThemedText
            variant="caption2"
            color={colors.secondaryLabel}
            style={styles.charCount}
          >
            {content.length} caracteres
          </ThemedText>
        </View>
      ) : (
        <ScaleSelector1To10
          value={numericValue}
          onChange={setNumericValue}
          disabled={isSubmitting}
        />
      )}

      <View style={styles.actionsRow}>
        <View style={{ flex: 1 }}>
          <AppButton
            title="Cancelar"
            variant="secondary"
            onPress={onClose}
            disabled={isSubmitting}
          />
        </View>
        <View style={{ flex: 1 }}>
          <AppButton
            title={isSubmitting ? "Guardando..." : "Guardar"}
            variant="primary"
            onPress={handleSave}
            disabled={!isValid || isSubmitting}
          />
        </View>
      </View>
    </View>
  );
}

export function ReflectionModal({
  visible,
  question,
  initialContent,
  initialNumericValue,
  onSave,
  onClose,
  isSubmitting = false,
}: ReflectionModalProps) {
  if (!question || !visible) return null;

  return (
    <AppBottomSheetModal visible={visible} onClose={onClose} maxWidth={580}>
      <ReflectionModalContent
        key={`${question.id}-${initialContent ?? ""}-${initialNumericValue ?? ""}`}
        question={question}
        initialContent={initialContent}
        initialNumericValue={initialNumericValue}
        onSave={onSave}
        onClose={onClose}
        isSubmitting={isSubmitting}
      />
    </AppBottomSheetModal>
  );
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
  },
  badgeRow: {
    flexDirection: "row",
    marginBottom: spacing.sm,
  },
  promptText: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  inputContainer: {
    marginBottom: spacing.md + 4,
    width: "100%",
  },
  textInput: {
    minHeight: 120,
    width: "100%",
  },
  charCount: {
    textAlign: "right",
    marginTop: spacing.xs,
  },
  actionsRow: {
    flexDirection: "row",
    gap: spacing.sm + 4,
    marginTop: spacing.sm + 2,
  },
});
