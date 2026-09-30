import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  type ReflectionQuestion,
  type ThemeCohort,
  type ReflectionTheme,
  type EntityId,
} from "@myself/shared";
import { PromptCard } from "../PromptCard";
import { CohortEnrollmentCard } from "../CohortEnrollmentCard";
import { CycleProgressBadge } from "../CycleProgressBadge";
import { ScaleSelector1To10 } from "../ScaleSelector1To10";
import { ReflectionModalContent } from "../ReflectionModal";
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
  enrollmentStartDate: "2026-09-20",
  enrollmentEndDate: "2026-09-30",
  programStartDate: "2026-10-01",
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
        currentDateStr="2026-09-25"
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
        currentDateStr="2026-10-10"
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

    const sheetHtml = renderToString(
      <BottomSheetModalContent
        onClose={() => {}}
        innerContent={<div>Sheet Content Body</div>}
      />,
    );
    expect(sheetHtml).toContain("Sheet Content Body");
  });
});
