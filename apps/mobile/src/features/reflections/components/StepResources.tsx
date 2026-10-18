import { Pressable, StyleSheet, View } from "react-native";
import type {
  ProgramStepResource,
  ProgramStepResourceKind,
} from "@myself/shared";
import { colors, radius, spacing } from "@/theme";
import { Card, ThemedText } from "@/components";
import { openExternalUrl } from "@/components/open-external-url";

const KIND_ICONS: Record<ProgramStepResourceKind, string> = {
  video: "🎬",
  audio: "🎧",
  link: "🔗",
};

interface StepResourcesProps {
  resources: ProgramStepResource[];
  testID?: string;
}

/**
 * Renders the extra multimedia resources of a program step as tappable links.
 * Renders nothing when the step carries no resources.
 */
export function StepResources({ resources, testID }: StepResourcesProps) {
  if (resources.length === 0) return null;

  const handleOpen = (url: string) => {
    void openExternalUrl(url);
  };

  return (
    <Card
      variant="subdued"
      padding="md"
      style={styles.container}
      testID={testID}
    >
      <ThemedText
        variant="caption2"
        color={colors.secondaryLabel}
        style={styles.header}
      >
        📎 Recursos del paso
      </ThemedText>
      <View style={styles.list}>
        {resources.map((resource) => (
          <Pressable
            key={resource.id}
            accessibilityRole="link"
            accessibilityLabel={resource.label}
            onPress={() => handleOpen(resource.url)}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <ThemedText variant="body" style={styles.icon}>
              {KIND_ICONS[resource.kind]}
            </ThemedText>
            <ThemedText
              variant="callout"
              color={colors.systemBlue}
              style={styles.label}
            >
              {resource.label}
            </ThemedText>
          </Pressable>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  header: {
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  list: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  rowPressed: {
    opacity: 0.6,
  },
  icon: {
    fontSize: 16,
  },
  label: {
    flex: 1,
    fontWeight: "600",
  },
});
