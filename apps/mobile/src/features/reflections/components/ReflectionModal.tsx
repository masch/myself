import { useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { type ReflectionQuestion } from "@myself/shared";
import { colors } from "@/theme/colors";
import { AppButton, AppBottomSheetModal, AppMarkdownText } from "@/components";
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

function ReflectionModalContent({
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
        <View style={[styles.badge, { backgroundColor: colors.systemGray15 }]}>
          <Text style={[styles.badgeText, { color: colors.secondaryLabel }]}>
            {isText ? "Reflexión Libre" : "Puntaje 1 al 10"}
          </Text>
        </View>
      </View>

      <AppMarkdownText style={[styles.promptText, { color: colors.label }]}>
        {question.prompt}
      </AppMarkdownText>

      {isText ? (
        <View style={styles.inputContainer}>
          <TextInput
            autoFocus
            style={[
              styles.textInput,
              {
                color: colors.label,
                backgroundColor: colors.systemBackground,
                borderColor: colors.systemGray15,
              },
            ]}
            placeholder="Escribí tu respuesta con honestidad..."
            placeholderTextColor={colors.secondaryLabel}
            value={content}
            onChangeText={setContent}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
          <Text style={[styles.charCount, { color: colors.secondaryLabel }]}>
            {content.length} caracteres
          </Text>
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
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  promptText: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 24,
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 20,
    width: "100%",
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    minHeight: 120,
    width: "100%",
  },
  charCount: {
    fontSize: 11,
    textAlign: "right",
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
  },
});
