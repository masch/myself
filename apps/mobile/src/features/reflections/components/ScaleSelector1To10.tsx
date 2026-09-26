import { View, Text, StyleSheet, Pressable } from "react-native";
import { colors } from "@/theme/colors";

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
              <Text
                style={[
                  styles.itemText,
                  {
                    color: isSelected ? colors.white : colors.label,
                    fontWeight: isSelected ? "700" : "500",
                  },
                ]}
              >
                {num}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.labelsRow}>
        <Text style={[styles.guideLabel, { color: colors.secondaryLabel }]}>
          1: Mínimo
        </Text>
        <Text style={[styles.guideLabel, { color: colors.secondaryLabel }]}>
          10: Pleno
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
  },
  item: {
    width: "18%",
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  itemText: {
    fontSize: 18,
  },
  labelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingHorizontal: 4,
  },
  guideLabel: {
    fontSize: 12,
  },
});
