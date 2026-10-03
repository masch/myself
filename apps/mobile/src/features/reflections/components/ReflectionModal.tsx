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
import { ItemListInput } from "./ItemListInput";
import { ScaleSelector1To10 } from "./ScaleSelector1To10";

interface ReflectionModalProps {
  visible: boolean;
  question: ReflectionQuestion | null;
  initialContent?: string;
  initialNumericValue?: number;
  initialItems?: string[];
  onSave: (input: {
    content?: string;
    numericValue?: number;
    items?: string[];
  }) => void;
  onClose: () => void;
  isSubmitting?: boolean;
}

export function ReflectionModalContent({
  question,
  initialContent = "",
  initialNumericValue = null,
  initialItems,
  onSave,
  onClose,
  isSubmitting = false,
}: {
  question: ReflectionQuestion;
  initialContent?: string;
  initialNumericValue?: number | null;
  initialItems?: string[];
  onSave: (input: {
    content?: string;
    numericValue?: number;
    items?: string[];
  }) => void;
  onClose: () => void;
  isSubmitting?: boolean;
}) {
  const [content, setContent] = useState(initialContent);
  const [numericValue, setNumericValue] = useState<number | null>(
    initialNumericValue,
  );

  const isText = question.responseType === "text";
  const isScale = question.responseType === "scale_1_10";
  const isItemList = question.responseType === "item_list";

  const minItems = question.config?.minItems ?? 1;
  const maxItems = question.config?.maxItems ?? "unlimited";

  const [items, setItems] = useState<string[]>(() => {
    if (initialItems && initialItems.length > 0) {
      return initialItems;
    }
    return Array.from({ length: minItems }, () => "");
  });

  const isValid = isText
    ? content.trim().length > 0
    : isScale
      ? numericValue !== null && numericValue >= 1 && numericValue <= 10
      : items.filter((it) => it.trim().length > 0).length >= minItems;

  const handleSave = () => {
    if (!isValid) return;
    const cleanItems = items
      .map((it) => it.trim())
      .filter((it) => it.length > 0);

    onSave({
      content: isText ? content.trim() : undefined,
      numericValue: isScale && numericValue !== null ? numericValue : undefined,
      items: isItemList ? cleanItems : undefined,
    });
  };

  const badgeLabel = isText
    ? "Reflexión Libre"
    : isScale
      ? "Puntaje 1 al 10"
      : "Lista de Momentos";

  return (
    <View style={styles.content}>
      <View style={styles.badgeRow}>
        <Badge variant="neutral" label={badgeLabel} />
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
      ) : isScale ? (
        <ScaleSelector1To10
          value={numericValue}
          onChange={setNumericValue}
          disabled={isSubmitting}
        />
      ) : (
        <ItemListInput
          items={items}
          onChangeItems={setItems}
          minItems={minItems}
          maxItems={maxItems}
          disabled={isSubmitting}
          placeholder="Escribí un motivo de gratitud..."
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
  initialItems,
  onSave,
  onClose,
  isSubmitting = false,
}: ReflectionModalProps) {
  if (!question || !visible) return null;

  const key = `${question.id}-${initialContent ?? ""}-${initialNumericValue ?? ""}-${initialItems?.join("|") ?? ""}`;

  return (
    <AppBottomSheetModal visible={visible} onClose={onClose} maxWidth={580}>
      <ReflectionModalContent
        key={key}
        question={question}
        initialContent={initialContent}
        initialNumericValue={initialNumericValue}
        initialItems={initialItems}
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
