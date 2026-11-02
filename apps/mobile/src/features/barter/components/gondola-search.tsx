import React from "react";
import { View, StyleSheet } from "react-native";
import { IconButton, ThemedTextInput } from "@/components";
import { spacing } from "@/theme";

interface GondolaSearchProps {
  value: string;
  onChangeText: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

/**
 * The search field of the gondola: 1531 packages cannot be browsed by scrolling,
 * so the name of a product or of its producer is how one is reached.
 *
 * The field carries a persistent accessible name instead of leaning on the
 * placeholder, which disappears as soon as somebody types, and the clear button
 * has its own label because a glyph is invisible to a screen reader.
 */
export function GondolaSearch({
  value,
  onChangeText,
  onFocus,
  onBlur,
}: GondolaSearchProps) {
  return (
    <View style={styles.row}>
      <ThemedTextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder="Buscar producto o productor"
        accessibilityLabel="Buscar producto o productor"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        style={styles.input}
        testID="gondola-search-input"
      />
      {value.length > 0 && (
        <IconButton
          icon="sf:xmark"
          accessibilityLabel="Limpiar búsqueda"
          hitSlop={12}
          onPress={() => onChangeText("")}
          testID="gondola-search-clear"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  input: {
    flex: 1,
  },
});
