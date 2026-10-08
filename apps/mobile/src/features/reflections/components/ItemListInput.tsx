import React, {
  useRef,
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  View,
  StyleSheet,
  type TextInput,
  type TextInputKeyPressEvent,
} from "react-native";
import { generateEntityId } from "@myself/shared";
import { colors, spacing, radius } from "@/theme";
import {
  ThemedText,
  ThemedTextInput,
  IconButton,
  ChipButton,
} from "@/components";

export interface ItemListRow {
  key?: string;
  id?: string;
  content: string;
}

export interface ItemListInputProps {
  items: (string | ItemListRow)[];
  onChangeItems: (items: ItemListRow[]) => void;
  minItems?: number;
  maxItems?: number | "unlimited";
  placeholder?: string;
  disabled?: boolean;
  autoFocusFirstItem?: boolean;
  onSubmitShortcut?: () => void;
}

export interface ItemListInputHandle {
  focusNext: () => void;
}

export const ItemListInput = forwardRef<
  ItemListInputHandle,
  ItemListInputProps
>(function ItemListInput(
  {
    items,
    onChangeItems,
    minItems = 1,
    maxItems = "unlimited",
    placeholder,
    disabled = false,
    autoFocusFirstItem = true,
    onSubmitShortcut,
  },
  ref,
) {
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const focusTargetIndexRef = useRef<number | null>(null);
  const [activeRowIndex, setActiveRowIndex] = useState<number>(0);

  useImperativeHandle(ref, () => ({
    focusNext: () => {
      handleRowSubmit(activeRowIndex);
    },
  }));

  // Normalize incoming items to stable row objects
  const normalizedItems: ItemListRow[] = items.map((item, idx) => {
    if (typeof item === "string") {
      return { key: `item-${idx}`, content: item };
    }
    return {
      ...item,
      key: item.key ?? item.id ?? `item-${idx}`,
    };
  });

  // Undo state & timer
  const [deletedItem, setDeletedItem] = useState<{
    index: number;
    row: ItemListRow;
  } | null>(null);
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (focusTargetIndexRef.current !== null) {
      const target = inputRefs.current[focusTargetIndexRef.current];
      if (target) {
        target.focus();
      }
      focusTargetIndexRef.current = null;
    }
  }, [items.length]);

  const canAdd =
    !disabled &&
    (maxItems === "unlimited" || normalizedItems.length < maxItems);

  const handleUpdate = (index: number, text: string) => {
    const updated = [...normalizedItems];
    updated[index] = { ...updated[index], content: text };
    onChangeItems(updated);
  };

  const handleAdd = () => {
    if (!canAdd) return;
    const newIndex = normalizedItems.length;
    focusTargetIndexRef.current = newIndex;
    onChangeItems([
      ...normalizedItems,
      { key: generateEntityId(), content: "" },
    ]);
  };

  const handleDelete = (index: number) => {
    if (disabled) return;
    const rowToDelete = normalizedItems[index];
    const updated = normalizedItems.filter((_, i) => i !== index);

    // Save for undo
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }
    setDeletedItem({ index, row: rowToDelete });
    undoTimeoutRef.current = setTimeout(() => {
      setDeletedItem(null);
    }, 4000);

    onChangeItems(
      updated.length > 0 ? updated : [{ key: generateEntityId(), content: "" }],
    );
  };

  const handleUndo = () => {
    if (!deletedItem) return;
    // Enforce capacity limit on undo
    if (maxItems !== "unlimited" && normalizedItems.length >= maxItems) {
      return;
    }
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }
    const restored = [...normalizedItems];
    const insertAt = Math.min(deletedItem.index, restored.length);
    restored.splice(insertAt, 0, deletedItem.row);
    focusTargetIndexRef.current = insertAt;
    onChangeItems(restored);
    setDeletedItem(null);
  };

  const handleRowKeyPress = (index: number, e: TextInputKeyPressEvent) => {
    const nativeEvt = e?.nativeEvent as any;
    if (
      (nativeEvt?.key === "Enter" || nativeEvt?.keyCode === 13) &&
      !nativeEvt?.shiftKey &&
      !nativeEvt?.ctrlKey &&
      !nativeEvt?.metaKey
    ) {
      nativeEvt?.preventDefault?.();
      handleRowSubmit(index);
    }
  };

  const handleRowKeyDown = (index: number, e: any) => {
    if (
      (e?.key === "Enter" || e?.keyCode === 13) &&
      !e?.shiftKey &&
      !e?.ctrlKey &&
      !e?.metaKey
    ) {
      e?.preventDefault?.();
      handleRowSubmit(index);
    }
  };

  const handleRowSubmit = (index: number) => {
    if (index < normalizedItems.length - 1) {
      inputRefs.current[index + 1]?.focus();
    } else if (canAdd) {
      handleAdd();
    }
  };

  const filledCount = normalizedItems.filter(
    (item) => item.content.trim().length > 0,
  ).length;

  return (
    <View style={styles.container}>
      {/* Helper requirement text */}
      <View style={styles.counterRow}>
        <ThemedText variant="caption1" color={colors.secondaryLabel}>
          {minItems > 0 && `Mínimo ${minItems} requeridos`}
          {maxItems !== "unlimited" && ` · Máximo ${maxItems}`}
        </ThemedText>
        <ThemedText
          variant="caption1"
          color={
            filledCount >= minItems ? colors.systemGreen : colors.secondaryLabel
          }
        >
          {`${filledCount} completado${filledCount === 1 ? "" : "s"}`}
        </ThemedText>
      </View>

      {/* Rows */}
      <View style={styles.list}>
        {normalizedItems.map((row, index) => {
          const isOnlyItem = normalizedItems.length <= 1;
          const isLast = index === normalizedItems.length - 1;
          const rowKey = row.key ?? `row-${index}`;

          return (
            <View key={rowKey} style={styles.row}>
              <ThemedText
                variant="callout"
                color={colors.secondaryLabel}
                style={styles.indexLabel}
              >
                {`${index + 1}.`}
              </ThemedText>
              <ThemedTextInput
                ref={(ref) => {
                  inputRefs.current[index] = ref;
                }}
                autoFocus={autoFocusFirstItem && index === 0}
                value={row.content}
                onChangeText={(text) => handleUpdate(index, text)}
                placeholder={placeholder ?? `Momento ${index + 1}...`}
                accessibilityLabel={`Ítem ${index + 1}`}
                multiline
                onFocus={() => setActiveRowIndex(index)}
                onKeyPress={(e) => handleRowKeyPress(index, e)}
                {...({
                  onKeyDown: (e: any) => handleRowKeyDown(index, e),
                } as any)}
                returnKeyType={isLast ? (canAdd ? "next" : "done") : "next"}
                onSubmitEditing={() => handleRowSubmit(index)}
                onSubmitShortcut={onSubmitShortcut}
                editable={!disabled}
                style={styles.input}
              />
              <IconButton
                icon="sf:trash"
                accessibilityLabel={`Eliminar ítem ${index + 1}`}
                color={isOnlyItem ? colors.systemGray : colors.systemRed}
                disabled={isOnlyItem || disabled}
                size="small"
                style={styles.deleteButton}
                onPress={() => handleDelete(index)}
              />
            </View>
          );
        })}
      </View>

      {/* Undo Notification Banner */}
      {deletedItem !== null && (
        <View style={styles.undoBanner}>
          <ThemedText
            variant="caption1"
            color={colors.label}
            style={styles.undoText}
          >
            Ítem eliminado
          </ThemedText>
          <ChipButton
            title="Deshacer"
            variant="secondary"
            accessibilityLabel="Deshacer eliminación de ítem"
            disabled={
              maxItems !== "unlimited" && normalizedItems.length >= maxItems
            }
            onPress={handleUndo}
          />
        </View>
      )}

      {/* Add Button */}
      {canAdd && (
        <View style={styles.addRow}>
          <ChipButton
            title="+ Agregar otro momento"
            variant="secondary"
            accessibilityLabel="Agregar otro ítem a la lista"
            onPress={handleAdd}
          />
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginVertical: spacing.sm,
  },
  counterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  indexLabel: {
    width: 24,
    textAlign: "right",
    fontWeight: "600",
    paddingTop: 11,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 110,
  },
  deleteButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  undoBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.systemGray15,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginTop: spacing.sm,
  },
  undoText: {
    fontStyle: "italic",
  },
  addRow: {
    marginTop: spacing.md,
    alignItems: "flex-start",
  },
});
