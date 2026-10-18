import { useRef, useState } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import {
  type EntityId,
  type ProgramStepContent,
  type ProgramStepResource,
  type ReflectionQuestion,
  generateEntityId,
} from "@myself/shared";
import {
  colors,
  fontWeights,
  letterSpacings,
  radius,
  spacing,
  typography,
} from "@/theme";
import {
  AppButton,
  AppBottomSheetModal,
  AppMarkdownText,
  AppMarkdown,
  Badge,
  ThemedText,
  ThemedTextInput,
  YouTubePlayer,
  useBottomSheetModalKeyboard,
} from "@/components";
import {
  ItemListInput,
  type ItemListRow,
  type ItemListInputHandle,
} from "./ItemListInput";
import { ScaleSelector1To10 } from "./ScaleSelector1To10";
import { StepResources } from "./StepResources";

interface ReflectionModalProps {
  visible: boolean;
  question: ReflectionQuestion | null;
  /** Whole step content of the question, so the modal can replay the lesson. */
  stepContent?: ProgramStepContent | null;
  /** Extra multimedia resources of the question's step content. */
  resources?: ProgramStepResource[] | null;
  preparatoryText?: string | null;
  initialContent?: string;
  initialNumericValue?: number;
  initialItems?: { id?: EntityId; content: string }[] | string[];
  onSave: (input: {
    content?: string;
    numericValue?: number;
    items?: { id?: EntityId; content: string }[];
  }) => void;
  onClose: () => void;
  isSubmitting?: boolean;
}

export function ReflectionModalContent({
  question,
  stepContent,
  resources,
  preparatoryText,
  initialContent = "",
  initialNumericValue = null,
  initialItems,
  onSave,
  onClose,
  isSubmitting = false,
}: {
  question: ReflectionQuestion;
  stepContent?: ProgramStepContent | null;
  resources?: ProgramStepResource[] | null;
  preparatoryText?: string | null;
  initialContent?: string;
  initialNumericValue?: number | null;
  initialItems?: { id?: EntityId; content: string }[] | string[];
  onSave: (input: {
    content?: string;
    numericValue?: number;
    items?: { id?: EntityId; content: string }[];
  }) => void;
  onClose: () => void;
  isSubmitting?: boolean;
}) {
  const itemListRef = useRef<ItemListInputHandle>(null);
  const isKeyboardVisible = useBottomSheetModalKeyboard();
  const [content, setContent] = useState(initialContent);
  const [numericValue, setNumericValue] = useState<number | null>(
    initialNumericValue,
  );

  const isText = question.responseType === "text";
  const isScale = question.responseType === "scale_1_10";
  const isItemList = question.responseType === "item_list";

  const minItems = question.config?.minItems ?? 1;
  const maxItems = question.config?.maxItems ?? "unlimited";

  const [items, setItems] = useState<ItemListRow[]>(() => {
    if (initialItems && initialItems.length > 0) {
      return initialItems.map((it) => {
        if (typeof it === "string") {
          return { key: generateEntityId(), content: it };
        }
        return {
          key: it.id ?? generateEntityId(),
          id: it.id,
          content: it.content,
        };
      });
    }
    return Array.from({ length: minItems }, () => ({
      key: generateEntityId(),
      content: "",
    }));
  });

  const isValid = isText
    ? content.trim().length > 0
    : isScale
      ? numericValue !== null && numericValue >= 1 && numericValue <= 10
      : items.filter((it) => it.content.trim().length > 0).length >= minItems;

  const handleSave = () => {
    if (!isValid || isSubmitting) return;
    const cleanItems = items
      .map((it) => ({
        id: it.id as EntityId | undefined,
        content: it.content.trim(),
      }))
      .filter((it) => it.content.length > 0);

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

  const stepPreparatoryText =
    stepContent?.preparatoryText ?? preparatoryText ?? null;

  return (
    <View style={styles.content}>
      <ScrollView
        style={styles.bodyScrollView}
        contentContainerStyle={styles.bodyScrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.badgeRow}>
          <Badge variant="neutral" label={badgeLabel} />
        </View>

        {stepContent?.videoUrl ? (
          <View style={styles.videoContainer}>
            <YouTubePlayer
              url={stepContent.videoUrl}
              title={`Video del Paso ${question.orderIndex}`}
              testID={`reflection-modal-video-${question.id}`}
            />
          </View>
        ) : null}

        {resources && resources.length > 0 ? (
          <View style={styles.resourcesContainer}>
            <StepResources resources={resources} />
          </View>
        ) : null}

        {stepPreparatoryText ? (
          <View style={styles.preparatoryContainer}>
            <ThemedText
              variant="caption2"
              color={colors.secondaryLabel}
              style={styles.preparatoryHeader}
            >
              📖 Consigna del día
            </ThemedText>
            <AppMarkdown>{stepPreparatoryText}</AppMarkdown>
          </View>
        ) : null}

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
              onSubmitShortcut={handleSave}
              multiline
              numberOfLines={5}
            />
            <View style={styles.footerRow}>
              <ThemedText
                variant="caption2"
                color={colors.secondaryLabel}
                style={styles.shortcutHint}
              >
                Ctrl+Enter para guardar
              </ThemedText>
              <ThemedText
                variant="caption2"
                color={colors.secondaryLabel}
                style={styles.charCount}
              >
                {content.length} caracteres
              </ThemedText>
            </View>
          </View>
        ) : isScale ? (
          <ScaleSelector1To10
            value={numericValue}
            onChange={setNumericValue}
            disabled={isSubmitting}
          />
        ) : (
          <ItemListInput
            ref={itemListRef}
            items={items}
            onChangeItems={setItems}
            minItems={minItems}
            maxItems={maxItems}
            disabled={isSubmitting}
            onSubmitShortcut={handleSave}
            placeholder="Escribí un motivo de gratitud..."
          />
        )}
      </ScrollView>

      {/* Fixed Modal Footer outside ScrollView */}
      <View style={styles.modalFooter}>
        {isKeyboardVisible ? (
          <View
            style={styles.keyboardAccessoryBar}
            testID="keyboard-accessory-bar"
          >
            <View style={{ flex: 1 }}>
              <AppButton
                title="Cancelar"
                variant="secondary"
                onPress={onClose}
                disabled={isSubmitting}
                style={styles.compactButton}
              />
            </View>
            {isItemList && (
              <View style={{ flex: 1.2 }}>
                <AppButton
                  title="Siguiente ↓"
                  variant="secondary"
                  onPress={() => itemListRef.current?.focusNext()}
                  disabled={isSubmitting}
                  style={styles.compactButton}
                  testID="keyboard-next-button"
                />
              </View>
            )}
            <View style={{ flex: 1.4 }}>
              <AppButton
                title={isSubmitting ? "Guardando..." : "Guardar"}
                icon="sf:checkmark"
                variant="primary"
                onPress={handleSave}
                disabled={!isValid || isSubmitting}
                style={styles.compactButton}
              />
            </View>
          </View>
        ) : (
          /* Standard bottom action row when keyboard is NOT active */
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
        )}
      </View>
    </View>
  );
}

export function ReflectionModal({
  visible,
  question,
  stepContent,
  resources,
  preparatoryText,
  initialContent,
  initialNumericValue,
  initialItems,
  onSave,
  onClose,
  isSubmitting = false,
}: ReflectionModalProps) {
  if (!question || !visible) return null;

  const itemsKey =
    initialItems
      ?.map((it) =>
        typeof it === "string" ? it : `${it.id ?? ""}:${it.content}`,
      )
      .join("|") ?? "";
  const key = `${question.id}-${initialContent ?? ""}-${initialNumericValue ?? ""}-${itemsKey}`;

  return (
    <AppBottomSheetModal
      visible={visible}
      onClose={onClose}
      scrollable={false}
      maxWidth={580}
    >
      <ReflectionModalContent
        key={key}
        question={question}
        stepContent={stepContent}
        resources={resources}
        preparatoryText={preparatoryText}
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
    maxHeight: "100%",
    display: "flex",
    flexDirection: "column",
  },
  bodyScrollView: {
    width: "100%",
    flexShrink: 1,
  },
  bodyScrollContent: {
    paddingBottom: spacing.sm,
    paddingHorizontal: 2,
    paddingTop: 2,
  },
  modalFooter: {
    width: "100%",
    flexShrink: 0,
    paddingTop: spacing.xs,
  },
  badgeRow: {
    flexDirection: "row",
    marginBottom: spacing.sm,
  },
  promptText: {
    ...typography.headline,
    fontWeight: fontWeights.bold,
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
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.sm,
  },
  shortcutHint: {
    fontStyle: "italic",
  },
  charCount: {
    textAlign: "right",
  },
  actionsRow: {
    flexDirection: "row",
    gap: spacing.sm + 4,
    marginTop: spacing.sm + 2,
  },
  keyboardAccessoryBar: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingTop: spacing.xs,
    alignItems: "center",
  },
  compactButton: {
    minHeight: 44,
  },
  preparatoryContainer: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.systemGray15,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  videoContainer: {
    marginBottom: spacing.md,
  },
  resourcesContainer: {
    marginBottom: spacing.md,
  },
  preparatoryHeader: {
    fontWeight: fontWeights.semibold,
    textTransform: "uppercase",
    letterSpacing: letterSpacings.caption,
  },
  preparatoryText: {
    ...typography.callout,
    color: colors.label,
  },
});
