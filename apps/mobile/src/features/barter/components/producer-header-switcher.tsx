import React, { useMemo, useState } from "react";
import { View, StyleSheet, FlatList, Pressable, Platform } from "react-native";
import {
  AppBottomSheetModal,
  AppButton,
  Badge,
  Card,
  ChipButton,
  IconButton,
  ThemedText,
  ThemedTextInput,
  useToast,
} from "@/components";
import {
  colors,
  fontSizes,
  fontWeights,
  letterSpacings,
  radius,
  spacing,
} from "@/theme";
import type { Producer, TradeMatch } from "@myself/shared";
import { buildProducerLink } from "../barter-store";
import {
  countCompletedTrades,
  countMatchesAwaitingReply,
} from "../inbox-utils";

interface ProducerHeaderSwitcherProps {
  activeProducer?: Producer;
  producers: Producer[];
  papConfigArs: number;
  onSelectProducer: (id: string) => void;
  onResetSeed?: () => void;
  /**
   * Every match, not only the active producer's: the selector answers "who still
   * owes an answer", which is a question about the other producers too.
   */
  matches?: TradeMatch[];
}

/**
 * Lowercase and accent-folded form of a producer field.
 *
 * Searching is how an operator reaches one of 158 producers, and nobody types
 * the tilde into a search box: "dona mecha" has to find "Doña Mecha".
 */
function foldForSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Matches the query against the producer name and the place it is printed
 * under, because an operator remembers one or the other ("Doña Mecha" or
 * "Arroyo Leyes"), and the catalog is far too long to browse.
 *
 * Exported so the rule is testable without rendering: this repo has no
 * component renderer.
 */
export function filterProducers(
  producers: Producer[],
  query: string,
): Producer[] {
  const trimmed = query.trim();
  if (!trimmed) return producers;

  const needle = foldForSearch(trimmed);

  return producers.filter(
    (producer) =>
      foldForSearch(producer.name).includes(needle) ||
      foldForSearch(producer.address).includes(needle),
  );
}

export function ProducerHeaderSwitcher({
  activeProducer,
  producers,
  papConfigArs,
  onSelectProducer,
  onResetSeed,
  matches,
}: ProducerHeaderSwitcherProps) {
  const toast = useToast();
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [query, setQuery] = useState("");

  // A simulation link only means something in a browser: the simulation is two
  // same-origin tabs, so on native the affordance is not rendered at all.
  const canCopyLink = Platform.OS === "web";

  const filteredProducers = useMemo(
    () => filterProducers(producers, query),
    [producers, query],
  );

  const awaitingReply = useMemo(
    () => countMatchesAwaitingReply(matches ?? []),
    [matches],
  );

  const completedTrades = useMemo(
    () => countCompletedTrades(matches ?? []),
    [matches],
  );

  const closeSelector = () => {
    setIsSelectorOpen(false);
    setQuery("");
  };

  const openSelector = () => {
    setQuery("");
    setIsSelectorOpen(true);
  };

  const handleSelectProducer = (id: string) => {
    onSelectProducer(id);
    closeSelector();
  };

  const handleCopyProducerLink = async (producer: Producer) => {
    const link = buildProducerLink(window.location.origin, producer.id);

    try {
      await navigator.clipboard.writeText(link);
      toast.success(`Link de ${producer.name} copiado`);
    } catch {
      toast.error(`No se pudo copiar. Link: ${link}`);
    }
  };

  const renderProducerRow = ({ item: producer }: { item: Producer }) => {
    const isActive = producer.id === activeProducer?.id;
    const waiting = awaitingReply[producer.id] ?? 0;
    const completed = completedTrades[producer.id] ?? 0;

    return (
      <View style={styles.selectorRowWrapper}>
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ checked: isActive }}
          accessibilityLabel={`${producer.name}, ${producer.address}, ${producer.productionType}${
            waiting > 0 ? `, ${waiting} sin responder` : ""
          }${completed > 0 ? `, ${completed} trueques hechos` : ""}`}
          onPress={() => handleSelectProducer(producer.id)}
          testID={`producer-option-${producer.id}`}
          style={[styles.selectorRow, isActive && styles.selectorRowActive]}
        >
          <View style={styles.selectorRowText}>
            <ThemedText variant="body" style={styles.selectorName}>
              {producer.name}
            </ThemedText>
            <ThemedText variant="caption1" style={styles.selectorAddress}>
              📍 {producer.address}
            </ThemedText>
            <Badge
              label={producer.productionType}
              variant={isActive ? "success" : "outline"}
              size="sm"
              style={styles.selectorTypeBadge}
            />
            {/* Answering a proposal is the reason to switch identity, so the
                list says who is waiting instead of making the operator check. */}
            {waiting > 0 && (
              <Badge
                label={
                  waiting === 1 ? "1 por responder" : `${waiting} por responder`
                }
                variant="warning"
                size="sm"
                style={styles.selectorTypeBadge}
                testID={`producer-awaiting-reply-${producer.id}`}
              />
            )}
            {/* History stays quiet and below the actionable badge: what a
                producer owes comes first, what it has already done second. */}
            {completed > 0 && (
              <Badge
                label={completed === 1 ? "1 trueque" : `${completed} trueques`}
                variant="neutral"
                size="sm"
                style={styles.selectorTypeBadge}
                testID={`producer-completed-trades-${producer.id}`}
              />
            )}
          </View>

          {isActive && (
            <ThemedText variant="caption2" style={styles.activeFlag}>
              EN USO
            </ThemedText>
          )}
        </Pressable>

        {canCopyLink && (
          <IconButton
            icon="sf:link"
            size="small"
            accessibilityLabel={`Copiar link de ${producer.name}`}
            testID={`copy-link-${producer.id}`}
            onPress={() => void handleCopyProducerLink(producer)}
          />
        )}
      </View>
    );
  };

  return (
    <Card variant="elevated" style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.producerInfo}>
          <ThemedText variant="caption1" style={styles.label}>
            ESTÁS OPERANDO COMO:
          </ThemedText>
          <ThemedText
            variant="headline"
            style={styles.producerName}
            testID="active-producer-name"
          >
            {activeProducer?.name ?? "Seleccionar productor"}
          </ThemedText>
          <ThemedText variant="caption1" style={styles.locationText}>
            📍 {activeProducer?.address}
          </ThemedText>
        </View>

        <View style={styles.badgeColumn} testID="producer-badge-column">
          {onResetSeed && (
            <ChipButton
              title="↺ Reiniciar Datos"
              variant="destructive"
              onPress={onResetSeed}
              style={styles.resetChip}
            />
          )}
          <Badge
            label={`1 PAP = $${papConfigArs.toLocaleString("es-AR")}`}
            variant="success"
            size="sm"
          />
          {activeProducer?.productionType && (
            <Badge
              label={activeProducer.productionType}
              variant="outline"
              size="sm"
              style={styles.typeBadge}
            />
          )}
        </View>
      </View>

      {/* The identity control is an action, not a status badge: it says what it
          does, carries a search glyph, and states the size of the catalog. */}
      <ThemedText variant="caption1" style={styles.switchLabel}>
        CAMBIAR DE PRODUCTOR
      </ThemedText>
      <ThemedText variant="caption1" style={styles.switchHint}>
        Buscá por nombre o localidad entre los {producers.length} productores de
        la red.
      </ThemedText>

      {/* One trigger instead of one chip per producer: the catalog is 158 long. */}
      <View style={styles.switchRow} testID="producer-switch-row">
        <ChipButton
          title={activeProducer?.name ?? "Seleccionar productor"}
          icon="sf:magnifyingglass"
          variant="success"
          // The decorative glyph otherwise lands in the accessible name as an
          // empty node (" Vermut Sabado"), so the name is stated explicitly.
          accessibilityLabel={activeProducer?.name ?? "Seleccionar productor"}
          accessibilityHint="Abre el buscador de productores"
          accessibilityState={{ expanded: isSelectorOpen }}
          onPress={openSelector}
          testID="producer-switch-trigger"
        />
      </View>

      <AppBottomSheetModal
        visible={isSelectorOpen}
        onClose={closeSelector}
        scrollable={false}
        testID="producer-selector-modal"
      >
        <View style={styles.selectorHeader}>
          <ThemedText variant="headline" style={styles.selectorTitle}>
            Elegir productor
          </ThemedText>
          <ThemedText
            variant="caption1"
            style={styles.selectorCount}
            testID="producer-selector-count"
          >
            {filteredProducers.length} de {producers.length}
          </ThemedText>
        </View>

        {canCopyLink && (
          <ThemedText variant="caption1" style={styles.selectorCount}>
            Copiá el link de un productor y abrilo en otra pestaña para operar
            como la contraparte.
          </ThemedText>
        )}

        <ThemedTextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar por nombre o localidad"
          accessibilityLabel="Buscar productor por nombre o localidad"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          autoFocus
          testID="producer-search-input"
        />

        <FlatList
          data={filteredProducers}
          keyExtractor={(producer) => producer.id}
          renderItem={renderProducerRow}
          style={styles.selectorList}
          contentContainerStyle={styles.selectorListContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <ThemedText
              variant="body"
              style={styles.emptyText}
              testID="producer-selector-empty"
            >
              Ningún productor coincide con “{query.trim()}”.
            </ThemedText>
          }
        />

        <View style={styles.selectorFooter}>
          <AppButton
            title="Cancelar"
            variant="secondary"
            onPress={closeSelector}
          />
        </View>
      </AppBottomSheetModal>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    backgroundColor: colors.secondarySystemBackground,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.separator,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.sm,
  },
  producerInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  label: {
    color: colors.secondaryLabel,
    fontWeight: fontWeights.bold,
    letterSpacing: letterSpacings.caption,
  },
  producerName: {
    color: colors.label,
    fontWeight: fontWeights.heavy,
    marginTop: spacing.xxs,
  },
  locationText: {
    color: colors.secondaryLabel,
    marginTop: spacing.xxs,
  },
  badgeColumn: {
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  typeBadge: {
    marginTop: spacing.xs,
  },
  switchLabel: {
    color: colors.secondaryLabel,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    letterSpacing: letterSpacings.caption,
    marginBottom: spacing.xxs,
  },
  switchHint: {
    color: colors.secondaryLabel,
    marginBottom: spacing.xs,
  },
  switchRow: {
    flexDirection: "row",
    gap: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  selectorHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  selectorTitle: {
    color: colors.label,
    fontWeight: fontWeights.heavy,
  },
  selectorCount: {
    color: colors.secondaryLabel,
  },
  selectorList: {
    flexGrow: 0,
    flexShrink: 1,
    marginTop: spacing.sm,
  },
  selectorListContent: {
    gap: spacing.xs,
  },
  selectorRowWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  selectorRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingHorizontal: spacing.compact,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: colors.separator,
    backgroundColor: colors.systemBackground,
  },
  selectorRowActive: {
    borderColor: colors.systemGreen,
    backgroundColor: colors.systemGreenSubdued,
  },
  selectorRowText: {
    flex: 1,
    gap: spacing.xxs,
  },
  selectorName: {
    color: colors.label,
    fontWeight: fontWeights.semibold,
  },
  selectorAddress: {
    color: colors.secondaryLabel,
  },
  selectorTypeBadge: {
    alignSelf: "flex-start",
  },
  activeFlag: {
    color: colors.systemGreen,
    fontWeight: fontWeights.bold,
    letterSpacing: letterSpacings.caption,
  },
  emptyText: {
    color: colors.secondaryLabel,
    paddingVertical: spacing.md,
  },
  selectorFooter: {
    paddingTop: spacing.sm,
  },
  resetChip: {
    borderColor: colors.systemRed,
  },
});
