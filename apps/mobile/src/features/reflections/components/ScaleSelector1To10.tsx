import { View, StyleSheet, Pressable } from "react-native";
import { colors, spacing, radius } from "@/theme";
import { ThemedText } from "@/components";

interface ScaleSelectorProps {
  value: number | null;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function ScaleSelector1To10({
  value,
  onChange,
  disabled = false,
}: ScaleSelectorProps) {
  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {numbers.map((num) => {
          const isSelected = value === num;
          return (
            <Pressable
              key={num}
              disabled={disabled}
              onPress={() => onChange(num)}
              style={({ pressed }) => [
                styles.item,
                {
                  backgroundColor: isSelected
                    ? colors.systemBlue
                    : colors.secondarySystemBackground,
                  borderColor: isSelected
                    ? colors.systemBlue
                    : colors.systemGray15,
                  opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`Puntaje ${num} de 10`}
            >
              <ThemedText
                variant="headline"
                color={isSelected ? colors.white : colors.label}
                style={[
                  styles.itemText,
                  {
                    fontWeight: isSelected ? "700" : "500",
                  },
                ]}
              >
                {num}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.labelsRow}>
        <ThemedText
          variant="caption1"
          color={colors.secondaryLabel}
          style={styles.guideLabel}
        >
          1: Mínimo
        </ThemedText>
        <ThemedText
          variant="caption1"
          color={colors.secondaryLabel}
          style={styles.guideLabel}
        >
          10: Pleno
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.md - 4,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  item: {
    width: "18%",
    aspectRatio: 1,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  itemText: {
    textAlign: "center",
  },
  labelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  guideLabel: {
    fontWeight: "500",
  },
});
