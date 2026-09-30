import { useState } from "react";
import { StyleSheet, View, type ColorValue } from "react-native";
import { Image } from "expo-image";
import {
  ScreenContainer,
  Card,
  ThemedText,
  Divider,
  ThemedTextInput,
  FormRow,
  SegmentedControl,
  Accordion,
  Collapsible,
  NativeFieldGroup,
  NativeListItem,
  NativeSwitch,
  NativePicker,
} from "@/components";
import { colors, spacing, typography, radius } from "@/theme";

const COLOR_SWATCHES: {
  category: string;
  items: { name: string; color: ColorValue; textColor?: ColorValue }[];
}[] = [
  {
    category: "Primary & System Accents",
    items: [
      { name: "systemBlue", color: colors.systemBlue },
      { name: "systemPurple", color: colors.systemPurple },
      { name: "systemGreen", color: colors.systemGreen },
      { name: "systemRed", color: colors.systemRed },
      { name: "systemOrange", color: colors.systemOrange },
      { name: "systemGray", color: colors.systemGray },
    ],
  },
  {
    category: "Subdued Tint Accents",
    items: [
      { name: "systemBlueSubdued", color: colors.systemBlueSubdued },
      { name: "systemPurpleSubdued", color: colors.systemPurpleSubdued },
      { name: "warningSubdued", color: colors.warningSubdued },
      { name: "destructiveSubdued", color: colors.destructiveSubdued },
      { name: "systemGray15", color: colors.systemGray15 },
    ],
  },
  {
    category: "Backgrounds & Fills",
    items: [
      {
        name: "systemBackground",
        color: colors.systemBackground,
        textColor: colors.label,
      },
      {
        name: "secondaryBackground",
        color: colors.secondarySystemBackground,
        textColor: colors.label,
      },
      {
        name: "separator",
        color: colors.separator,
        textColor: colors.label,
      },
      {
        name: "shadow",
        color: colors.shadow,
        textColor: colors.white,
      },
    ],
  },
];

const TYPOGRAPHY_VARIANTS: (keyof typeof typography)[] = [
  "largeTitle",
  "title1",
  "title2",
  "headline",
  "body",
  "callout",
  "caption1",
  "caption2",
];

const SPACING_ITEMS: (keyof typeof spacing)[] = [
  "xs",
  "sm",
  "md",
  "lg",
  "xl",
  "xxl",
];

const RADIUS_ITEMS: (keyof typeof radius)[] = ["sm", "md", "lg", "xl", "full"];

export default function DevShowcaseScreen() {
  const [isSwitchEnabled, setIsSwitchEnabled] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState("typescript");
  const [isCollapsibleOpen, setIsCollapsibleOpen] = useState(false);

  return (
    <ScreenContainer.Scroll>
      <View style={styles.container}>
        {/* Header Hero */}
        <Card variant="subdued" padding="lg" style={styles.heroCard}>
          <ThemedText variant="largeTitle" style={styles.heroTitle}>
            Design System
          </ThemedText>
          <ThemedText
            variant="callout"
            color={colors.secondaryLabel}
            style={styles.heroSubtitle}
          >
            Living documentation and visual verification of @myself/mobile
            design tokens, accessible primitives, and platform-native controls.
          </ThemedText>
        </Card>

        {/* 1. Color Tokens */}
        <View style={styles.section}>
          <ThemedText variant="title2">1. Color Tokens</ThemedText>
          <ThemedText variant="caption1" color={colors.secondaryLabel}>
            Strict single-source colors defined in @/theme
          </ThemedText>

          {COLOR_SWATCHES.map((group) => (
            <View key={group.category} style={styles.groupContainer}>
              <ThemedText
                variant="caption1"
                color={colors.secondaryLabel}
                style={styles.groupTitle}
              >
                {group.category.toUpperCase()}
              </ThemedText>
              <View style={styles.swatchGrid}>
                {group.items.map((swatch) => (
                  <View key={swatch.name} style={styles.swatchItem}>
                    <View
                      style={[
                        styles.swatchColor,
                        {
                          backgroundColor: swatch.color,
                          borderColor: colors.separator,
                        },
                      ]}
                    />
                    <ThemedText variant="caption2" style={styles.boldText}>
                      {swatch.name}
                    </ThemedText>
                    <ThemedText
                      variant="caption2"
                      color={colors.secondaryLabel}
                    >
                      {typeof swatch.color === "string"
                        ? swatch.color
                        : "Dynamic"}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* 2. Typography Tokens & <ThemedText> */}
        <View style={styles.section}>
          <ThemedText variant="title2">2. Typography Hierarchy</ThemedText>
          <ThemedText variant="caption1" color={colors.secondaryLabel}>
            Native typography scale enforced via &lt;ThemedText&gt;
          </ThemedText>

          <Card variant="outlined" padding="md" style={styles.variantsCard}>
            {TYPOGRAPHY_VARIANTS.map((tokenKey) => {
              const spec = typography[tokenKey];
              return (
                <View key={tokenKey} style={styles.typographyRow}>
                  <View style={styles.typographyLabelCol}>
                    <ThemedText
                      variant="caption2"
                      color={colors.systemBlue}
                      style={styles.boldText}
                    >
                      {tokenKey}
                    </ThemedText>
                    <ThemedText
                      variant="caption2"
                      color={colors.secondaryLabel}
                    >
                      {spec.fontSize}pt / {spec.lineHeight}lh
                    </ThemedText>
                  </View>
                  <ThemedText
                    variant={tokenKey}
                    style={styles.typographySample}
                  >
                    The quick brown fox
                  </ThemedText>
                </View>
              );
            })}
          </Card>
        </View>

        {/* 3. Spacing Grid (4pt scale) */}
        <View style={styles.section}>
          <ThemedText variant="title2">3. Spacing Scale</ThemedText>
          <ThemedText variant="caption1" color={colors.secondaryLabel}>
            Harmonic 4-point design system spacing tokens
          </ThemedText>

          <Card variant="outlined" padding="md" style={styles.scaleCard}>
            {SPACING_ITEMS.map((key) => (
              <View key={key} style={styles.scaleRow}>
                <ThemedText
                  variant="caption2"
                  style={[styles.scaleKeyText, styles.boldText]}
                >
                  {key} ({spacing[key]}px)
                </ThemedText>
                <View
                  style={[
                    styles.spacingBar,
                    {
                      width: Math.min(spacing[key] * 6, 200),
                      backgroundColor: colors.systemBlue,
                    },
                  ]}
                />
              </View>
            ))}
          </Card>
        </View>

        {/* 4. Radius Scale */}
        <View style={styles.section}>
          <ThemedText variant="title2">
            4. Corner Radii &amp; Curvature
          </ThemedText>
          <ThemedText variant="caption1" color={colors.secondaryLabel}>
            Smooth continuous curvature tokens
          </ThemedText>

          <View style={styles.radiusGrid}>
            {RADIUS_ITEMS.map((key) => (
              <View key={key} style={styles.radiusItem}>
                <View
                  style={[
                    styles.radiusBox,
                    {
                      borderRadius: radius[key],
                      borderColor: colors.separator,
                      backgroundColor: colors.secondarySystemBackground,
                    },
                  ]}
                />
                <ThemedText variant="caption2" style={styles.boldText}>
                  {key} ({radius[key]}px)
                </ThemedText>
              </View>
            ))}
          </View>
        </View>

        {/* 5. Core Primitives: <Card> / <Surface> */}
        <View style={styles.section}>
          <ThemedText variant="title2">
            5. Core Primitives: &lt;Card&gt;
          </ThemedText>
          <ThemedText variant="caption1" color={colors.secondaryLabel}>
            Continuous curvature surface container variants
          </ThemedText>

          <View style={styles.cardsStack}>
            <Card variant="elevated" padding="md">
              <ThemedText variant="headline">Elevated Card</ThemedText>
              <ThemedText variant="callout" color={colors.secondaryLabel}>
                Uses shadows.sm preset and systemBackground.
              </ThemedText>
            </Card>

            <Card variant="outlined" padding="md">
              <ThemedText variant="headline">Outlined Card</ThemedText>
              <ThemedText variant="callout" color={colors.secondaryLabel}>
                Uses colors.separator border with transparent fill.
              </ThemedText>
            </Card>

            <Card variant="subdued" padding="md">
              <ThemedText variant="headline">Subdued Card</ThemedText>
              <ThemedText variant="callout" color={colors.secondaryLabel}>
                Uses secondarySystemBackground fill without borders.
              </ThemedText>
            </Card>
          </View>
        </View>

        {/* 6. Accessible Headless Primitives */}
        <View style={styles.section}>
          <ThemedText variant="title2">6. Accessible Primitives</ThemedText>
          <ThemedText variant="caption1" color={colors.secondaryLabel}>
            @rn-primitives wrapped with design tokens
          </ThemedText>

          <Card variant="outlined" padding="md">
            <ThemedText
              variant="caption1"
              color={colors.secondaryLabel}
              style={styles.boldText}
            >
              COLLAPSIBLE PRIMITIVE
            </ThemedText>

            <Collapsible
              open={isCollapsibleOpen}
              onOpenChange={setIsCollapsibleOpen}
            >
              <Collapsible.Trigger>
                <ThemedText
                  variant="body"
                  color={colors.systemBlue}
                  style={styles.boldText}
                >
                  {isCollapsibleOpen
                    ? "▼ Hide Details"
                    : "► Show Collapsible Details"}
                </ThemedText>
              </Collapsible.Trigger>
              <Collapsible.Content>
                <ThemedText
                  variant="callout"
                  color={colors.secondaryLabel}
                  style={styles.collapsibleBody}
                >
                  This content is rendered inside the accessible Collapsible
                  primitive with automated accessibility states and smooth
                  layout toggles.
                </ThemedText>
              </Collapsible.Content>
            </Collapsible>

            <View style={styles.primitiveDivider} />

            <ThemedText
              variant="caption1"
              color={colors.secondaryLabel}
              style={styles.boldText}
            >
              ACCORDION PRIMITIVE
            </ThemedText>

            <Accordion type="single" collapsible={true}>
              <Accordion.Item value="item-1">
                <Accordion.Header>
                  <Accordion.Trigger>
                    <ThemedText variant="body" style={styles.boldText}>
                      What is the Platform-First pattern?
                    </ThemedText>
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content>
                  <ThemedText variant="callout" color={colors.secondaryLabel}>
                    Prioritizing native UI controls and native OS capabilities
                    before falling back to custom reimplementations.
                  </ThemedText>
                </Accordion.Content>
              </Accordion.Item>

              <Accordion.Item value="item-2">
                <Accordion.Header>
                  <Accordion.Trigger>
                    <ThemedText variant="body" style={styles.boldText}>
                      How are design tokens encapsulated?
                    </ThemedText>
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content>
                  <ThemedText variant="callout" color={colors.secondaryLabel}>
                    All tokens are housed in src/theme/tokens/ and exported
                    exclusively through the unified @/theme entry point.
                  </ThemedText>
                </Accordion.Content>
              </Accordion.Item>
            </Accordion>
          </Card>
        </View>

        {/* 7. Platform-Native Controls */}
        <View style={styles.section}>
          <ThemedText variant="title2">7. Platform-Native Controls</ThemedText>
          <ThemedText variant="caption1" color={colors.secondaryLabel}>
            @expo/ui native controls with iOS/Android cross-platform parity
          </ThemedText>

          <NativeFieldGroup>
            <NativeFieldGroup.Section title="Live Interactive Controls">
              <NativeListItem
                leading={
                  <Image
                    source="sf:bell.badge.fill"
                    style={[styles.itemIcon, { tintColor: colors.systemBlue }]}
                  />
                }
                supportingText="Toggle platform-native switch"
                trailing={
                  <NativeSwitch
                    value={isSwitchEnabled}
                    onValueChange={setIsSwitchEnabled}
                    accessibilityLabel="Toggle notifications"
                  />
                }
              >
                Push Notifications
              </NativeListItem>

              <NativeListItem
                leading={
                  <Image
                    source="sf:chevron.left.forwardslash.chevron.right"
                    style={[
                      styles.itemIcon,
                      { tintColor: colors.systemPurple },
                    ]}
                  />
                }
                supportingText="Native platform picker"
                layout="vertical"
                trailing={
                  <NativePicker
                    options={[
                      { label: "TypeScript", value: "typescript" },
                      { label: "Rust", value: "rust" },
                      { label: "Swift", value: "swift" },
                      { label: "Kotlin", value: "kotlin" },
                    ]}
                    value={selectedLanguage}
                    onValueChange={setSelectedLanguage}
                  />
                }
              >
                Preferred Language
              </NativeListItem>
            </NativeFieldGroup.Section>
          </NativeFieldGroup>
        </View>

        {/* 8. Atomic Primitives: Divider & ThemedTextInput */}
        <View style={styles.section}>
          <ThemedText variant="title2">
            8. Atomic Primitives: &lt;Divider&gt; &amp; &lt;ThemedTextInput&gt;
          </ThemedText>
          <ThemedText variant="caption1" color={colors.secondaryLabel}>
            Canonical divider line and token-enforcing form input
          </ThemedText>

          <Card variant="subdued" padding="md">
            <ThemedText variant="headline">Horizontal Divider</ThemedText>
            <ThemedText variant="caption1" color={colors.secondaryLabel}>
              hairlineWidth using colors.separator with token insets
            </ThemedText>
            <Divider inset="sm" style={{ marginVertical: spacing.sm }} />

            <ThemedText variant="headline" style={{ marginTop: spacing.sm }}>
              ThemedTextInput
            </ThemedText>
            <ThemedTextInput
              placeholder="Canonical input with token padding & curvature..."
              style={{ marginTop: spacing.xs }}
            />
          </Card>
        </View>

        {/* 9. FormRow Compound Component */}
        <View style={styles.section}>
          <ThemedText variant="title2">
            9. FormRow Compound Component
          </ThemedText>
          <ThemedText variant="caption1" color={colors.secondaryLabel}>
            Grouped card form row with slots for Leading, Input, and Trailing
          </ThemedText>

          <Card variant="subdued" padding="none">
            <FormRow style={{ paddingHorizontal: spacing.md }}>
              <FormRow.Leading>
                <Image
                  source="sf:magnifyingglass"
                  style={{
                    width: 20,
                    height: 20,
                    tintColor: colors.systemBlue,
                  }}
                />
              </FormRow.Leading>
              <FormRow.Input placeholder="Search query..." />
            </FormRow>

            <Divider inset="md" />

            <FormRow style={{ paddingHorizontal: spacing.md }}>
              <FormRow.Leading>
                <Image
                  source="sf:tag.fill"
                  style={{
                    width: 20,
                    height: 20,
                    tintColor: colors.systemPurple,
                  }}
                />
              </FormRow.Leading>
              <FormRow.Input placeholder="Category tag" />
              <FormRow.Trailing>
                <ThemedText variant="caption1" color={colors.secondaryLabel}>
                  Optional
                </ThemedText>
              </FormRow.Trailing>
            </FormRow>
          </Card>
        </View>

        {/* 10. SegmentedControl */}
        <View style={styles.section}>
          <ThemedText variant="title2">10. SegmentedControl</ThemedText>
          <ThemedText variant="caption1" color={colors.secondaryLabel}>
            iOS-style segmented tab control with badges and accessible tablist
          </ThemedText>

          <SegmentedControl
            values={[
              { value: "daily", label: "Daily Queue", badge: 4 },
              { value: "cohorts", label: "Programs" },
              { value: "history", label: "History" },
            ]}
            selectedValue="daily"
            onValueChange={() => {}}
          />
        </View>
      </View>
    </ScreenContainer.Scroll>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  heroCard: {
    gap: spacing.xs,
  },
  heroTitle: {
    fontWeight: "700",
  },
  heroSubtitle: {
    marginTop: spacing.xs,
  },
  section: {
    gap: spacing.xs,
  },
  groupContainer: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  groupTitle: {
    letterSpacing: 0.5,
    fontWeight: "600",
  },
  boldText: {
    fontWeight: "600",
  },
  swatchGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  swatchItem: {
    width: 100,
    gap: spacing.xs,
  },
  swatchColor: {
    height: 48,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  variantsCard: {
    gap: spacing.md,
  },
  typographyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
    paddingBottom: spacing.sm,
  },
  typographyLabelCol: {
    width: 110,
    gap: 2,
  },
  typographySample: {
    flex: 1,
    textAlign: "right",
  },
  scaleCard: {
    gap: spacing.sm,
  },
  scaleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  scaleKeyText: {
    width: 130,
  },
  spacingBar: {
    height: 12,
    borderRadius: radius.sm,
  },
  radiusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  radiusItem: {
    alignItems: "center",
    gap: spacing.xs,
  },
  radiusBox: {
    width: 56,
    height: 56,
    borderWidth: 1.5,
  },
  cardsStack: {
    gap: spacing.md,
  },
  collapsibleBody: {
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  primitiveDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.separator,
    marginVertical: spacing.md,
  },
  itemIcon: {
    width: 24,
    height: 24,
  },
});
