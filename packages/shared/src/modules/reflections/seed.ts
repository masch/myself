import type { EntityId } from "../../primitives";
import type { CohortStatus, Periodicity, ResponseType } from "./types";

export interface SeedReflectionCategory {
  id: EntityId;
  slug: string;
  name: string;
  description: string;
}

export interface SeedReflectionTheme {
  id: EntityId;
  categoryId: EntityId;
  title: string;
  description: string;
  targetQuestionCount: number;
  catchUpWindowDays: number;
  editWindowDays: number;
}

export interface SeedThemeCohort {
  id: EntityId;
  themeId: EntityId;
  name: string;
  enrollmentStartDate: string;
  enrollmentEndDate: string;
  programStartDate: string;
  status: CohortStatus;
}

export interface SeedReflectionQuestion {
  id: EntityId;
  categoryId: EntityId;
  themeId: EntityId | null;
  prompt: string;
  periodicity: Periodicity;
  preferredTimeOfDay: string | null;
  responseType: ResponseType;
  isDefaultSuggested: boolean;
  orderIndex: number;
}

export const SEED_REFLECTION_CATEGORIES: SeedReflectionCategory[] = [
  {
    id: "c1000000-0000-4000-8000-000000000001" as EntityId,
    slug: "stoicism",
    name: "Estoicismo",
    description: "Prácticas estoicas para la resiliencia y el autodominio",
  },
  {
    id: "c2000000-0000-4000-8000-000000000001" as EntityId,
    slug: "gratitude",
    name: "Gratitud",
    description: "Apreciación del presente y reconocimiento de lo valioso",
  },
];

export const SEED_REFLECTION_THEMES: SeedReflectionTheme[] = [
  {
    id: "e1000000-0000-4000-8000-000000000001" as EntityId,
    categoryId: "c1000000-0000-4000-8000-000000000001" as EntityId,
    title: "7 Días de Resiliencia Estoica",
    description:
      "Programa progresivo de una semana para cultivar calma y discernimiento ante las dificultades.",
    targetQuestionCount: 7,
    catchUpWindowDays: 2,
    editWindowDays: 3,
  },
];

export const SEED_THEME_COHORTS: SeedThemeCohort[] = [
  {
    id: "a1000000-0000-4000-8000-000000000001" as EntityId,
    themeId: "e1000000-0000-4000-8000-000000000001" as EntityId,
    name: "Convocatoria Abierta",
    enrollmentStartDate: "2026-09-01",
    enrollmentEndDate: "2026-12-31",
    programStartDate: "2026-09-15",
    status: "open_for_enrollment",
  },
];

export const SEED_REFLECTION_QUESTIONS: SeedReflectionQuestion[] = [
  {
    id: "b1000000-0000-4000-8000-000000000001" as EntityId,
    categoryId: "c1000000-0000-4000-8000-000000000001" as EntityId,
    themeId: "e1000000-0000-4000-8000-000000000001" as EntityId,
    prompt:
      "¿Qué situaciones de hoy estuvieron completamente fuera de tu control y cómo reaccionaste?",
    periodicity: "daily",
    preferredTimeOfDay: "20:00",
    responseType: "text",
    isDefaultSuggested: false,
    orderIndex: 1,
  },
  {
    id: "b1000000-0000-4000-8000-000000000002" as EntityId,
    categoryId: "c1000000-0000-4000-8000-000000000001" as EntityId,
    themeId: "e1000000-0000-4000-8000-000000000001" as EntityId,
    prompt:
      "Del 1 al 10, ¿qué tan sereno lograste mantenerte ante los imprevistos de hoy?",
    periodicity: "daily",
    preferredTimeOfDay: "20:00",
    responseType: "scale_1_10",
    isDefaultSuggested: false,
    orderIndex: 2,
  },
  {
    id: "b1000000-0000-4000-8000-000000000003" as EntityId,
    categoryId: "c1000000-0000-4000-8000-000000000001" as EntityId,
    themeId: "e1000000-0000-4000-8000-000000000001" as EntityId,
    prompt:
      "¿Qué incomodidad voluntaria o esfuerzo elegiste atravesar hoy para fortalecer tu carácter?",
    periodicity: "daily",
    preferredTimeOfDay: "20:00",
    responseType: "text",
    isDefaultSuggested: false,
    orderIndex: 3,
  },
  {
    id: "b1000000-0000-4000-8000-000000000004" as EntityId,
    categoryId: "c1000000-0000-4000-8000-000000000001" as EntityId,
    themeId: "e1000000-0000-4000-8000-000000000001" as EntityId,
    prompt:
      "¿En qué momento del día sentiste que perdiste el foco y qué lo provocó?",
    periodicity: "daily",
    preferredTimeOfDay: "20:00",
    responseType: "text",
    isDefaultSuggested: false,
    orderIndex: 4,
  },
  {
    id: "b1000000-0000-4000-8000-000000000005" as EntityId,
    categoryId: "c1000000-0000-4000-8000-000000000001" as EntityId,
    themeId: "e1000000-0000-4000-8000-000000000001" as EntityId,
    prompt:
      "Del 1 al 10, ¿en qué medida tus acciones de hoy reflejaron tus valores más altos?",
    periodicity: "daily",
    preferredTimeOfDay: "20:00",
    responseType: "scale_1_10",
    isDefaultSuggested: false,
    orderIndex: 5,
  },
  {
    id: "b1000000-0000-4000-8000-000000000006" as EntityId,
    categoryId: "c1000000-0000-4000-8000-000000000001" as EntityId,
    themeId: "e1000000-0000-4000-8000-000000000001" as EntityId,
    prompt:
      "¿Qué lección valiosa te dejó el error más notable que cometiste hoy?",
    periodicity: "daily",
    preferredTimeOfDay: "20:00",
    responseType: "text",
    isDefaultSuggested: false,
    orderIndex: 6,
  },
  {
    id: "b1000000-0000-4000-8000-000000000007" as EntityId,
    categoryId: "c1000000-0000-4000-8000-000000000001" as EntityId,
    themeId: "e1000000-0000-4000-8000-000000000001" as EntityId,
    prompt:
      "¿Por qué hecho o persona estás profundamente agradecido al cerrar este ciclo?",
    periodicity: "daily",
    preferredTimeOfDay: "20:00",
    responseType: "text",
    isDefaultSuggested: false,
    orderIndex: 7,
  },
  {
    id: "b2000000-0000-4000-8000-000000000001" as EntityId,
    categoryId: "c2000000-0000-4000-8000-000000000001" as EntityId,
    themeId: null,
    prompt: "Intención matutina: ¿Cuál es tu prioridad innegociable para hoy?",
    periodicity: "daily",
    preferredTimeOfDay: "08:00",
    responseType: "text",
    isDefaultSuggested: true,
    orderIndex: 0,
  },
  {
    id: "b2000000-0000-4000-8000-000000000002" as EntityId,
    categoryId: "c1000000-0000-4000-8000-000000000001" as EntityId,
    themeId: null,
    prompt:
      "Check-in nocturno: Del 1 al 10, ¿cómo evaluarías tu energía y bienestar al cerrar el día?",
    periodicity: "daily",
    preferredTimeOfDay: "21:00",
    responseType: "scale_1_10",
    isDefaultSuggested: true,
    orderIndex: 0,
  },
  {
    id: "b3000000-0000-4000-8000-000000000001" as EntityId,
    categoryId: "c1000000-0000-4000-8000-000000000001" as EntityId,
    themeId: null,
    prompt:
      "Claridad ante el caos: ¿Qué emoción predomina en este instante y qué pensamiento la está alimentando?",
    periodicity: "ad_hoc",
    preferredTimeOfDay: null,
    responseType: "text",
    isDefaultSuggested: false,
    orderIndex: 0,
  },
];
