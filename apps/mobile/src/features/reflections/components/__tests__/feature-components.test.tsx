import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  DateTime,
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
import { BottomSheetModalContent } from "@/components";

const mockId = (id: string) => id as EntityId;

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
    expect(html).toContain("🎧");
    expect(html).toContain("🎬");
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
});
