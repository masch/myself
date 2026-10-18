import { describe, expect, it, mock } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  DateTime,
  type ProgramStepContent,
  type ProgramStepResource,
  type ReflectionQuestion,
  type ThemeCohort,
  type ReflectionTheme,
  type EntityId,
  type UserReflection,
} from "@myself/shared";
import { PromptCard } from "../PromptCard";
import { CohortEnrollmentCard } from "../CohortEnrollmentCard";
import { CycleProgressBadge } from "../CycleProgressBadge";
import { ScaleSelector1To10 } from "../ScaleSelector1To10";
import { ReflectionModalContent } from "../ReflectionModal";
import { ItemListInput } from "../ItemListInput";
import { StepResources } from "../StepResources";
import {
  ProgramPreviewContent,
  ProgramPreviewDegradedState,
} from "../ProgramPreviewSheet";
import { BottomSheetModalContent } from "@/components";

const mockId = (id: string) => id as EntityId;

/** react-dom/server separates text from interpolations with HTML comments. */
const stripSsrInterpolations = (html: string) =>
  html.replace(/<!--[^>]*-->/g, "");

/**
 * Walks a rendered React element tree looking for a `testID`. Used to reach a
 * hook-free component's retry control and invoke its `onPress` without a DOM
 * renderer, which this suite does not have.
 */
function findElementByTestID(
  node: React.ReactNode,
  testID: string,
): React.ReactElement<{ onPress?: () => void }> | null {
  if (!React.isValidElement(node)) return null;
  const props = node.props as { testID?: string; children?: React.ReactNode };
  if (props.testID === testID) {
    return node as React.ReactElement<{ onPress?: () => void }>;
  }
  for (const child of React.Children.toArray(props.children)) {
    const found = findElementByTestID(child, testID);
    if (found) return found;
  }
  return null;
}

const mockQuestion: ReflectionQuestion = {
  id: mockId("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c51"),
  categoryId: mockId("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c52"),
  themeId: mockId("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c53"),
  prompt: "What made you smile today?",
  periodicity: "daily",
  responseType: "text",
  isDefaultSuggested: false,
  orderIndex: 1,
  createdAt: "2026-09-01",
};

const mockCohort: ThemeCohort = {
  id: mockId("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c54"),
  themeId: mockId("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c53"),
  name: "Morning Reflection Cohort",
  enrollmentStartDate: DateTime.from("2026-09-20"),
  enrollmentEndDate: DateTime.from("2026-09-30"),
  programStartDate: DateTime.from("2026-10-01"),
  enrollmentGraceDays: 2,
  status: "open_for_enrollment",
  createdAt: "2026-09-01",
};

const mockTheme: ReflectionTheme = {
  id: mockId("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c53"),
  categoryId: mockId("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c52"),
  title: "Mindful Morning",
  description: "Theme description",
  targetQuestionCount: 7,
  catchUpWindowDays: 2,
  editWindowDays: 3,
  createdAt: "2026-09-01",
};

const mockResources: ProgramStepResource[] = [
  {
    id: mockId("f2000000-0000-4000-8000-000000000001"),
    stepContentId: mockId("d2000000-0000-4000-8000-000000000004"),
    kind: "audio",
    label: "Audio: Meditación desde arriba",
    url: "https://drive.google.com/file/d/mock-audio/view",
    orderIndex: 1,
    createdAt: "2026-09-04T00:00:00.000Z",
  },
  {
    id: mockId("f2000000-0000-4000-8000-000000000002"),
    stepContentId: mockId("d2000000-0000-4000-8000-000000000004"),
    kind: "video",
    label: "Video: Meditación desde arriba",
    url: "https://www.youtube.com/watch?v=az1IKPZ7N2U",
    orderIndex: 2,
    createdAt: "2026-09-04T00:00:00.000Z",
  },
];

describe("Reflections Feature Components", () => {
  it("renders PromptCard with question prompt and action buttons", () => {
    const html = renderToString(
      <PromptCard question={mockQuestion} onAnswer={() => {}} />,
    );
    expect(html).toContain("What made you smile today?");
    expect(html).toContain("Responder");
  });

  it("renders CohortEnrollmentCard with details and grace period info", () => {
    const html = renderToString(
      <CohortEnrollmentCard
        cohort={mockCohort}
        theme={mockTheme}
        onEnroll={() => {}}
        currentDate={DateTime.from("2026-09-25")}
      />,
    );
    expect(html).toContain("Mindful Morning");
    expect(html).toContain("Morning Reflection Cohort");
    expect(html).toContain("Plazo de gracia para sumarte:");
    expect(html).toContain("Sumarme a la convocatoria");
  });

  it("renders CohortEnrollmentCard in closed state when past enrollment deadline", () => {
    const html = renderToString(
      <CohortEnrollmentCard
        cohort={mockCohort}
        theme={mockTheme}
        onEnroll={() => {}}
        currentDate={DateTime.from("2026-10-10")}
      />,
    );
    expect(html).toContain("Inscripción cerrada");
    expect(html).not.toContain("Sumarme a la convocatoria");
  });

  it("renders CycleProgressBadge", () => {
    const html = renderToString(
      <CycleProgressBadge
        currentStep={2}
        totalSteps={7}
        answeredCount={1}
        skippedCount={0}
        status="in_progress"
      />,
    );
    expect(html).toContain("Paso 2 de 7");
  });

  it("renders ScaleSelector1To10", () => {
    const html = renderToString(
      <ScaleSelector1To10 value={5} onChange={() => {}} />,
    );
    expect(html).toContain("5");
    expect(html).toContain("1: Mínimo");
    expect(html).toContain("10: Pleno");
  });

  it("renders ReflectionModal content and SkipReasonSheet body", () => {
    const modalHtml = renderToString(
      <ReflectionModalContent
        question={mockQuestion}
        onSave={() => {}}
        onClose={() => {}}
      />,
    );
    expect(modalHtml).toContain("Reflexión Libre");

    const modalWithPrep = renderToString(
      <ReflectionModalContent
        question={mockQuestion}
        preparatoryText="*Consigna preparatoria del ejercicio*"
        onSave={() => {}}
        onClose={() => {}}
      />,
    );
    expect(modalWithPrep).toContain("Consigna del día");
    expect(modalWithPrep).toContain("Consigna preparatoria");

    const modalWithStepContent = renderToString(
      <ReflectionModalContent
        question={mockQuestion}
        stepContent={{
          id: mockId("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c55"),
          questionId: mockQuestion.id,
          videoUrl: "https://youtu.be/6jolZrkdsOw?si=JttIr2THqvgmWE0X",
          preparatoryText: "Consigna del paso con video",
          createdAt: "2026-10-12T00:00:00.000Z",
        }}
        onSave={() => {}}
        onClose={() => {}}
      />,
    );
    expect(modalWithStepContent).toContain("Consigna del paso con video");
    expect(modalWithStepContent).toContain(
      `reflection-modal-video-${mockQuestion.id}`,
    );
    expect(modalWithStepContent).not.toContain("Recursos del paso");

    const modalWithResources = renderToString(
      <ReflectionModalContent
        question={mockQuestion}
        resources={mockResources}
        onSave={() => {}}
        onClose={() => {}}
      />,
    );
    expect(modalWithResources).toContain("Recursos del paso");
    expect(modalWithResources).toContain("Audio: Meditación desde arriba");
    expect(modalWithResources).toContain("Video: Meditación desde arriba");

    const sheetHtml = renderToString(
      <BottomSheetModalContent
        onClose={() => {}}
        innerContent={<div>Sheet Content Body</div>}
      />,
    );
    expect(sheetHtml).toContain("Sheet Content Body");
  });

  it("renders ItemListInput with numbered rows, minimum requirements and add button", () => {
    const html = renderToString(
      <ItemListInput
        items={["Agradezco por el sol", "Agradezco por un buen café", ""]}
        onChangeItems={() => {}}
        minItems={3}
        maxItems="unlimited"
      />,
    );
    expect(html).toContain("Mínimo 3 requeridos");
    expect(html).toContain("2 completados");
    expect(html).toContain("1.");
    expect(html).toContain("2.");
    expect(html).toContain("3.");
    expect(html).toContain("Agradezco por el sol");
    expect(html).toContain("Agradezco por un buen café");
    expect(html).toContain("+ Agregar otro momento");
  });

  it("renders PromptCard for item_list question in unanswered and answered states", () => {
    const itemListQuestion: ReflectionQuestion = {
      ...mockQuestion,
      id: mockId("b2000000-0000-4000-8000-000000000003"),
      prompt: "¿De qué 3 cosas te sentís agradecido hoy?",
      responseType: "item_list",
      config: { minItems: 3, maxItems: "unlimited" },
    };

    // Unanswered
    const unansweredHtml = renderToString(
      <PromptCard question={itemListQuestion} onAnswer={() => {}} />,
    );
    expect(unansweredHtml).toContain("Lista de momentos");
    expect(unansweredHtml).toContain(
      "¿De qué 3 cosas te sentís agradecido hoy?",
    );
    expect(unansweredHtml).toContain("Responder");

    // Answered with items
    const mockAnsweredReflection: UserReflection = {
      id: mockId("c3000000-0000-4000-8000-000000000001"),
      userId: mockId("u1000000-0000-4000-8000-000000000001"),
      questionId: itemListQuestion.id,
      themeId: null,
      cycleRunId: null,
      status: "answered",
      content: null,
      numericValue: null,
      items: [
        {
          id: mockId("item-1"),
          reflectionId: mockId("c3000000-0000-4000-8000-000000000001"),
          orderIndex: 0,
          content: "Paz mental",
          createdAt: "2026-10-03T10:00:00Z",
          updatedAt: "2026-10-03T10:00:00Z",
        },
        {
          id: mockId("item-2"),
          reflectionId: mockId("c3000000-0000-4000-8000-000000000001"),
          orderIndex: 1,
          content: "Café rico",
          createdAt: "2026-10-03T10:05:00Z",
          updatedAt: "2026-10-03T10:05:00Z",
        },
        {
          id: mockId("item-3"),
          reflectionId: mockId("c3000000-0000-4000-8000-000000000001"),
          orderIndex: 2,
          content: "Buena charla",
          createdAt: "2026-10-03T10:10:00Z",
          updatedAt: "2026-10-03T10:10:00Z",
        },
      ],
      skipReason: null,
      forDate: "2026-10-03",
      createdAt: "2026-10-03T10:10:00Z",
      updatedAt: "2026-10-03T10:10:00Z",
    };

    const answeredHtml = renderToString(
      <PromptCard
        question={itemListQuestion}
        reflection={mockAnsweredReflection}
        onAnswer={() => {}}
      />,
    );
    expect(answeredHtml).toContain("3 momentos anotados");
    expect(answeredHtml).toContain("Ver lista");
  });

  it("renders ReflectionModalContent for item_list questions", () => {
    const itemListQuestion: ReflectionQuestion = {
      ...mockQuestion,
      id: mockId("b2000000-0000-4000-8000-000000000003"),
      prompt: "¿De qué 3 cosas te sentís agradecido hoy?",
      responseType: "item_list",
      config: { minItems: 3, maxItems: "unlimited" },
    };

    const modalHtml = renderToString(
      <ReflectionModalContent
        question={itemListQuestion}
        onSave={() => {}}
        onClose={() => {}}
      />,
    );
    expect(modalHtml).toContain("Lista de Momentos");
    expect(modalHtml).toContain("Mínimo 3 requeridos");
    expect(modalHtml).toContain("1.");
    expect(modalHtml).toContain("2.");
    expect(modalHtml).toContain("3.");
  });

  it("renders StepResources labels as links and nothing for an empty list", () => {
    const html = renderToString(<StepResources resources={mockResources} />);
    expect(html).toContain("📎 Recursos del paso");
    expect(html.match(/🎧/g)?.length).toBe(1);
    expect(html.match(/🎬/g)?.length).toBe(1);
    expect(html).toContain("Audio: Meditación desde arriba");
    expect(html).toContain("Video: Meditación desde arriba");
    expect(html.match(/role="link"/g)?.length).toBe(2);

    const emptyHtml = renderToString(<StepResources resources={[]} />);
    expect(emptyHtml).toBe("");
  });

  it("renders desktop shortcut hint and floating keyboard accessory bar when keyboard is active", () => {
    // Check desktop shortcut hint
    const textModalHtml = renderToString(
      <ReflectionModalContent
        question={mockQuestion}
        onSave={() => {}}
        onClose={() => {}}
      />,
    );
    expect(textModalHtml).toContain("Ctrl+Enter para guardar");

    // Check floating accessory bar inside BottomSheetModalContent with keyboard active
    const activeKeyboardHtml = renderToString(
      <BottomSheetModalContent
        onClose={() => {}}
        isKeyboardVisible={true}
        innerContent={
          <ReflectionModalContent
            question={mockQuestion}
            onSave={() => {}}
            onClose={() => {}}
          />
        }
      />,
    );
    expect(activeKeyboardHtml).toContain(
      'data-testid="keyboard-accessory-bar"',
    );
    expect(activeKeyboardHtml).toContain("Guardar");

    // Check Siguiente button for item_list questions
    const activeItemListKeyboardHtml = renderToString(
      <BottomSheetModalContent
        onClose={() => {}}
        isKeyboardVisible={true}
        innerContent={
          <ReflectionModalContent
            question={{
              ...mockQuestion,
              responseType: "item_list",
            }}
            onSave={() => {}}
            onClose={() => {}}
          />
        }
      />,
    );
    expect(activeItemListKeyboardHtml).toContain(
      'data-testid="keyboard-next-button"',
    );
    expect(activeItemListKeyboardHtml).toContain("Siguiente ↓");
  });

  it("renders the program preview step list with prompts and type labels but no answer action", () => {
    const steps: ReflectionQuestion[] = [
      {
        ...mockQuestion,
        id: mockId("b5000000-0000-4000-8000-000000000001"),
        prompt: "¿Qué te hizo sonreír hoy?",
        responseType: "text",
        orderIndex: 1,
      },
      {
        ...mockQuestion,
        id: mockId("b5000000-0000-4000-8000-000000000002"),
        prompt: "¿Cuánta calma sentís ahora?",
        responseType: "scale_1_10",
        orderIndex: 2,
      },
      {
        ...mockQuestion,
        id: mockId("b5000000-0000-4000-8000-000000000003"),
        prompt: "Anotá tres momentos que agradecés",
        responseType: "item_list",
        orderIndex: 3,
      },
    ];

    const html = stripSsrInterpolations(
      renderToString(
        <ProgramPreviewContent
          cohort={mockCohort}
          theme={mockTheme}
          steps={steps}
          currentDate={DateTime.from("2026-09-25")}
          onClose={() => {}}
        />,
      ),
    );

    expect(html).toContain("Paso 1");
    expect(html).toContain("Paso 2");
    expect(html).toContain("Paso 3");
    expect(html).toContain("Texto libre");
    expect(html).toContain("Escala 1-10");
    expect(html).toContain("Lista de momentos");
    expect(html).toContain("¿Qué te hizo sonreír hoy?");
    expect(html).toContain("¿Cuánta calma sentís ahora?");
    expect(html).toContain("Anotá tres momentos que agradecés");
    expect(html).not.toContain("Responder");
    expect(html).not.toContain("Omitir");
  });

  it("shows the unlock date for a step that is still locked in the cohort", () => {
    const steps: ReflectionQuestion[] = [
      { ...mockQuestion, orderIndex: 1 },
      {
        ...mockQuestion,
        id: mockId("b5000000-0000-4000-8000-000000000002"),
        prompt: "Segunda pregunta del programa",
        orderIndex: 2,
      },
    ];

    const html = stripSsrInterpolations(
      renderToString(
        <ProgramPreviewContent
          cohort={mockCohort}
          theme={mockTheme}
          steps={steps}
          currentDate={DateTime.from("2026-10-01")}
          onClose={() => {}}
        />,
      ),
    );

    expect(html).toContain("Se desbloquea el 02/10");
    expect(html).not.toContain("Se desbloquea el 01/10");
  });

  it("shows a degraded message with a retry when the preview load reports an error", () => {
    const html = stripSsrInterpolations(
      renderToString(
        <ProgramPreviewContent
          cohort={mockCohort}
          theme={mockTheme}
          steps={[]}
          error={new Error("contents read failed")}
          onRetry={() => {}}
          currentDate={DateTime.from("2026-09-25")}
          onClose={() => {}}
        />,
      ),
    );

    expect(html).toContain("No pudimos cargar todo el programa");
    expect(html).toContain("Reintentar");
  });

  it("keeps the resolved steps visible under the degraded message", () => {
    const html = stripSsrInterpolations(
      renderToString(
        <ProgramPreviewContent
          cohort={mockCohort}
          theme={mockTheme}
          steps={[mockQuestion]}
          error={new Error("contents read failed")}
          onRetry={() => {}}
          currentDate={DateTime.from("2026-09-25")}
          onClose={() => {}}
        />,
      ),
    );

    expect(html).toContain("No pudimos cargar todo el programa");
    expect(html).toContain("Paso 1");
  });

  it("does not show the degraded message when the preview load succeeded", () => {
    const html = stripSsrInterpolations(
      renderToString(
        <ProgramPreviewContent
          cohort={mockCohort}
          theme={mockTheme}
          steps={[mockQuestion]}
          currentDate={DateTime.from("2026-09-25")}
          onClose={() => {}}
        />,
      ),
    );

    expect(html).not.toContain("No pudimos cargar todo el programa");
    expect(html).not.toContain("Reintentar");
  });

  it("invokes the retry callback from the degraded state's retry control", () => {
    const retry = mock(() => {});
    const tree = ProgramPreviewDegradedState({ onRetry: retry });
    const button = findElementByTestID(tree, "program-preview-retry");

    expect(button).not.toBeNull();
    button?.props.onPress?.();
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("keeps the step detail collapsed until the user expands it", () => {
    const stepContent: ProgramStepContent = {
      id: mockId("d2000000-0000-4000-8000-000000000004"),
      questionId: mockQuestion.id,
      videoUrl: "https://youtu.be/uqN5Z9tsacg?si=u_4PfZ_71SlJni8r",
      preparatoryText: "Consigna preparatoria del paso",
      createdAt: "2026-09-04T00:00:00.000Z",
    };

    const collapsedHtml = renderToString(
      <ProgramPreviewContent
        cohort={mockCohort}
        theme={mockTheme}
        steps={[mockQuestion]}
        contents={[stepContent]}
        resources={mockResources}
        currentDate={DateTime.from("2026-10-01")}
        onClose={() => {}}
      />,
    );

    expect(collapsedHtml).toContain("Ver el detalle del paso");
    expect(collapsedHtml).not.toContain("Consigna preparatoria del paso");
    expect(collapsedHtml).not.toContain("Recursos del paso");
  });

  it("reveals the lesson video, the consigna and the step resources when the detail is expanded", () => {
    const stepContent: ProgramStepContent = {
      id: mockId("d2000000-0000-4000-8000-000000000004"),
      questionId: mockQuestion.id,
      videoUrl: "https://youtu.be/uqN5Z9tsacg?si=u_4PfZ_71SlJni8r",
      preparatoryText: "Consigna preparatoria del paso",
      createdAt: "2026-09-04T00:00:00.000Z",
    };

    const expandedHtml = renderToString(
      <ProgramPreviewContent
        cohort={mockCohort}
        theme={mockTheme}
        steps={[mockQuestion]}
        contents={[stepContent]}
        resources={mockResources}
        initiallyExpandedStepId={mockQuestion.id}
        currentDate={DateTime.from("2026-10-01")}
        onClose={() => {}}
      />,
    );

    expect(expandedHtml).toContain("📖 Consigna del día");
    expect(expandedHtml).toContain("Consigna preparatoria del paso");
    expect(expandedHtml).toContain("📎 Recursos del paso");
    expect(expandedHtml).toContain("Audio: Meditación desde arriba");
    expect(expandedHtml).toContain(`program-preview-video-${mockQuestion.id}`);
    expect(expandedHtml).not.toContain("Responder");
    expect(expandedHtml).not.toContain("Omitir");
  });

  it("renders the program preview button only when onPreview is provided", () => {
    const withoutPreview = renderToString(
      <CohortEnrollmentCard
        cohort={mockCohort}
        theme={mockTheme}
        onEnroll={() => {}}
        currentDate={DateTime.from("2026-09-25")}
      />,
    );
    expect(withoutPreview).not.toContain("Ver qué vas a reflexionar");

    const withPreview = renderToString(
      <CohortEnrollmentCard
        cohort={mockCohort}
        theme={mockTheme}
        onEnroll={() => {}}
        onPreview={() => {}}
        currentDate={DateTime.from("2026-09-25")}
      />,
    );
    expect(withPreview).toContain("Ver qué vas a reflexionar");
    expect(withPreview).toContain('aria-label="Ver qué vas a reflexionar"');
  });

  it("pins the resource card to a borderless card", () => {
    const html = renderToString(<StepResources resources={mockResources} />);
    // react-native-web compiles the static styles into atomic classes, so the
    // card that keeps a border renders an `r-borderWidth-*` class here even
    // though the border color never resolves for the subdued variant.
    const cardClasses = /^<div class="([^"]*)"/.exec(html)?.[1] ?? "";
    expect(cardClasses).not.toContain("r-borderWidth-");
  });

  it("keeps the reflection component styles on @/theme tokens", () => {
    const literalPattern =
      /\b(letterSpacing|opacity|fontSize|fontWeight):\s*("[^"]*"|[0-9.]+)/;

    for (const file of [
      "StepResources.tsx",
      "ProgramPreviewSheet.tsx",
      "ReflectionModal.tsx",
    ]) {
      const source = readFileSync(join(import.meta.dir, "..", file), "utf8");
      expect(source.match(literalPattern)?.[0]).toBeUndefined();
    }
  });
});
