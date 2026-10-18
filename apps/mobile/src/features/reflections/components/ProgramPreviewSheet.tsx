import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import type {
  DateTime,
  EntityId,
  ProgramStepContent,
  ProgramStepResource,
  ReflectionQuestion,
  ReflectionTheme,
  ThemeCohort,
} from "@myself/shared";
import { colors, radius, spacing } from "@/theme";
import {
  Accordion,
  AppBottomSheetModal,
  AppButton,
  AppMarkdown,
  AppMarkdownText,
  Badge,
  Card,
  Spinner,
  ThemedText,
  YouTubePlayer,
} from "@/components";
import { StepResources } from "./StepResources";
import { getResponseTypeLabel } from "../domain/response-type-label";
import {
  formatDateDDMM,
  getCohortStepUnlockDate,
  isCohortStepUnlocked,
} from "../domain/time-lock";

export interface ProgramPreviewContentProps {
  cohort: ThemeCohort;
  theme: ReflectionTheme | null;
  steps: ReflectionQuestion[];
  contents?: ProgramStepContent[] | null;
  resources?: ProgramStepResource[] | null;
  isLoading?: boolean;
  currentDate?: DateTime;
  /** Opens one step detail on first render; every step starts collapsed without it. */
  initiallyExpandedStepId?: EntityId;
  onClose: () => void;
}

/**
 * Read-only program body: lists every step of a thematic cohort so a user who is
 * not enrolled can see the questions, type labels and (behind a collapsed
 * detail) the lesson video, the consigna and the step resources. It never renders
 * an answer, skip or enrollment affordance.
 */
export function ProgramPreviewContent({
  cohort,
  theme,
  steps,
  contents,
  resources,
  isLoading = false,
  currentDate,
  initiallyExpandedStepId,
  onClose,
}: ProgramPreviewContentProps) {
  const [expandedStepId, setExpandedStepId] = useState<EntityId | undefined>(
    initiallyExpandedStepId,
  );

  const orderedSteps = [...steps].sort(
    (a, b) => a.orderIndex - b.orderIndex || a.id.localeCompare(b.id),
  );

  return (
    <View style={styles.content}>
      <ScrollView
        testID="program-preview-scroll"
        style={styles.bodyScrollView}
        contentContainerStyle={styles.bodyScrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <ThemedText
          variant="headline"
          color={colors.label}
          style={styles.title}
        >
          {theme?.title ?? cohort.name}
        </ThemedText>
        <ThemedText
          variant="callout"
          color={colors.secondaryLabel}
          style={styles.subtitle}
        >
          Así se ve el programa antes de sumarte. Es solo una vista previa: acá
          no se responde ni se omiten pasos.
        </ThemedText>

        {isLoading ? (
          <Spinner
            size="md"
            label="Cargando vista previa..."
            style={styles.loadingBox}
          />
        ) : null}

        {orderedSteps.map((step) => {
          const stepContent =
            contents?.find((content) => content.questionId === step.id) ?? null;
          const stepResources = stepContent
            ? (resources ?? [])
                .filter((resource) => resource.stepContentId === stepContent.id)
                .sort(
                  (a, b) =>
                    a.orderIndex - b.orderIndex || a.id.localeCompare(b.id),
                )
            : [];
          const hasDetail = Boolean(
            stepContent?.videoUrl ||
            stepContent?.preparatoryText ||
            stepResources.length > 0,
          );

          const isLocked = !isCohortStepUnlocked(
            cohort.programStartDate,
            step.orderIndex,
            currentDate,
          );
          const unlockDate = getCohortStepUnlockDate(
            cohort.programStartDate,
            step.orderIndex,
          );

          return (
            <Card
              key={step.id}
              variant="subdued"
              padding="md"
              style={styles.stepCard}
              testID={`program-preview-step-${step.orderIndex}`}
            >
              <View style={styles.stepHeaderRow}>
                <ThemedText
                  variant="callout"
                  color={colors.label}
                  style={styles.stepTitle}
                >
                  Paso {step.orderIndex}
                </ThemedText>
                <Badge
                  variant="neutral"
                  size="sm"
                  label={getResponseTypeLabel(step.responseType)}
                />
              </View>

              <AppMarkdownText
                style={[styles.promptText, { color: colors.label }]}
              >
                {step.prompt}
              </AppMarkdownText>

              {isLocked ? (
                <ThemedText
                  variant="caption1"
                  color={colors.secondaryLabel}
                  style={styles.lockedInfo}
                >
                  🔒 Se desbloquea el {formatDateDDMM(unlockDate)}
                </ThemedText>
              ) : null}

              {hasDetail ? (
                <Accordion
                  type="single"
                  collapsible
                  value={expandedStepId as string | undefined}
                  onValueChange={(value) =>
                    setExpandedStepId(value ? (value as EntityId) : undefined)
                  }
                >
                  <Accordion.Item value={step.id} style={styles.detailItem}>
                    <Accordion.Header>
                      <Accordion.Trigger
                        accessibilityLabel={`Ver el detalle del paso ${step.orderIndex}`}
                      >
                        <ThemedText
                          variant="callout"
                          color={colors.systemBlue}
                          style={styles.detailTriggerText}
                        >
                          Ver el detalle del paso
                        </ThemedText>
                      </Accordion.Trigger>
                    </Accordion.Header>
                    <Accordion.Content style={styles.detailContent}>
                      {stepContent?.videoUrl ? (
                        <View style={styles.videoContainer}>
                          <YouTubePlayer
                            url={stepContent.videoUrl}
                            title={`Video del Paso ${step.orderIndex}`}
                            testID={`program-preview-video-${step.id}`}
                          />
                        </View>
                      ) : null}

                      {stepContent?.preparatoryText ? (
                        <View style={styles.preparatoryContainer}>
                          <ThemedText
                            variant="caption2"
                            color={colors.secondaryLabel}
                            style={styles.preparatoryHeader}
                          >
                            📖 Consigna del día
                          </ThemedText>
                          <AppMarkdown>
                            {stepContent.preparatoryText}
                          </AppMarkdown>
                        </View>
                      ) : null}

                      <StepResources
                        resources={stepResources}
                        testID={`program-preview-resources-${step.orderIndex}`}
                      />
                    </Accordion.Content>
                  </Accordion.Item>
                </Accordion>
              ) : null}
            </Card>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <ThemedText
          variant="caption1"
          color={colors.secondaryLabel}
          style={styles.footerHint}
        >
          Cuando te sumes, vas a poder responder cada paso en su día.
        </ThemedText>
        <AppButton
          title="Cerrar"
          variant="secondary"
          accessibilityLabel="Cerrar la vista previa"
          onPress={onClose}
        />
      </View>
    </View>
  );
}

export interface ProgramPreviewSheetProps extends ProgramPreviewContentProps {
  visible: boolean;
}

/**
 * Bottom sheet wrapper for the read-only program preview.
 */
export function ProgramPreviewSheet({
  visible,
  cohort,
  ...contentProps
}: ProgramPreviewSheetProps) {
  if (!visible || !cohort) return null;

  return (
    <AppBottomSheetModal
      visible={visible}
      onClose={contentProps.onClose}
      scrollable={false}
      maxWidth={580}
      testID="program-preview-sheet"
    >
      <ProgramPreviewContent cohort={cohort} {...contentProps} />
    </AppBottomSheetModal>
  );
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
    maxHeight: "100%",
    display: "flex",
    flexDirection: "column",
    flexShrink: 1,
    minHeight: 0,
  },
  bodyScrollView: {
    width: "100%",
    flexShrink: 1,
    minHeight: 0,
  },
  bodyScrollContent: {
    paddingHorizontal: 2,
    paddingTop: 2,
    paddingBottom: spacing.sm,
    gap: spacing.sm + 2,
  },
  title: {
    fontWeight: "700",
  },
  subtitle: {
    marginBottom: spacing.xs,
  },
  loadingBox: {
    paddingVertical: spacing.md,
  },
  stepCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.systemGray15,
    gap: spacing.sm,
  },
  stepHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  stepTitle: {
    fontWeight: "700",
  },
  promptText: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 22,
  },
  lockedInfo: {
    fontWeight: "600",
  },
  detailItem: {
    borderBottomWidth: 0,
  },
  detailTriggerText: {
    fontWeight: "600",
  },
  detailContent: {
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  videoContainer: {
    marginBottom: spacing.xs,
  },
  preparatoryContainer: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.systemGray15,
    gap: spacing.xs,
  },
  preparatoryHeader: {
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  footer: {
    width: "100%",
    flexShrink: 0,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  footerHint: {
    textAlign: "center",
  },
});
