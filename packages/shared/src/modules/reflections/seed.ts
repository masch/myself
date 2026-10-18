import { DateTime, type EntityId } from "../../primitives";
import type {
  CohortStatus,
  Periodicity,
  ProgramStepResourceKind,
  ReflectionQuestionConfig,
  ResponseType,
} from "./types";

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
  enrollmentGraceDays: number;
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
  config?: ReflectionQuestionConfig | null;
  isDefaultSuggested: boolean;
  orderIndex: number;
}

export interface SeedProgramStepContent {
  id: EntityId;
  questionId: EntityId;
  videoUrl?: string | null;
  preparatoryText?: string | null;
  createdAt: string;
}

export interface SeedProgramStepResource {
  id: EntityId;
  stepContentId: EntityId;
  kind: ProgramStepResourceKind;
  label: string;
  url: string;
  orderIndex: number;
  createdAt: string;
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
  {
    id: "e2000000-0000-4000-8000-000000000001" as EntityId,
    categoryId: "c1000000-0000-4000-8000-000000000001" as EntityId,
    title: "Dicotomía del Control Estoico",
    description:
      "Aprende a distinguir lo que depende de ti y lo que no, para actuar con serenidad y claridad mental.",
    targetQuestionCount: 6,
    catchUpWindowDays: 2,
    editWindowDays: 3,
  },
];

export function getTodayDateString(now?: DateTime): string {
  return DateTime.today(now).toISODate();
}

export function createSeedThemeCohorts(
  baseDateStr: string = getTodayDateString(),
): SeedThemeCohort[] {
  const baseDt = DateTime.from(baseDateStr);
  return [
    {
      id: "a1000000-0000-4000-8000-000000000001" as EntityId,
      themeId: "e1000000-0000-4000-8000-000000000001" as EntityId,
      name: "Convocatoria Abierta",
      enrollmentStartDate: "2026-09-01",
      enrollmentEndDate: "2026-12-31",
      programStartDate: "2026-09-15",
      enrollmentGraceDays: 2,
      status: "open_for_enrollment",
    },
    {
      id: "a1000000-0000-4000-8000-000000000002" as EntityId,
      themeId: "e1000000-0000-4000-8000-000000000001" as EntityId,
      name: "Convocatoria en Curso",
      enrollmentStartDate: baseDt.addDays(-7).toISODate(),
      enrollmentEndDate: baseDt.addDays(30).toISODate(),
      programStartDate: baseDt.toISODate(),
      enrollmentGraceDays: 2,
      status: "open_for_enrollment",
    },
    {
      id: "a2000000-0000-4000-8000-000000000001" as EntityId,
      themeId: "e2000000-0000-4000-8000-000000000001" as EntityId,
      name: "Convocatoria Dicotomía del Control",
      enrollmentStartDate: baseDt.addDays(-7).toISODate(),
      enrollmentEndDate: baseDt.addDays(30).toISODate(),
      programStartDate: baseDt.toISODate(),
      enrollmentGraceDays: 2,
      status: "open_for_enrollment",
    },
  ];
}

export const SEED_THEME_COHORTS: SeedThemeCohort[] = createSeedThemeCohorts();

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
    id: "b2000000-0000-4000-8000-000000000003" as EntityId,
    categoryId: "c2000000-0000-4000-8000-000000000001" as EntityId,
    themeId: null,
    prompt: "Gratitud diaria: ¿De qué 3 momentos o cosas estás agradecido hoy?",
    periodicity: "daily",
    preferredTimeOfDay: "20:30",
    responseType: "item_list",
    config: { minItems: 3, maxItems: "unlimited" },
    isDefaultSuggested: true,
    orderIndex: 0,
  },
  {
    id: "b2000000-0000-4000-8000-000000000004" as EntityId,
    categoryId: "c1000000-0000-4000-8000-000000000001" as EntityId,
    themeId: null,
    prompt: "¿Qué hice mal hoy?",
    periodicity: "daily",
    preferredTimeOfDay: "21:30",
    responseType: "item_list",
    config: { minItems: 3, maxItems: "unlimited" },
    isDefaultSuggested: true,
    orderIndex: 1,
  },
  {
    id: "b2000000-0000-4000-8000-000000000005" as EntityId,
    categoryId: "c1000000-0000-4000-8000-000000000001" as EntityId,
    themeId: null,
    prompt: "¿Qué hice bien hoy?",
    periodicity: "daily",
    preferredTimeOfDay: "21:30",
    responseType: "item_list",
    config: { minItems: 3, maxItems: "unlimited" },
    isDefaultSuggested: true,
    orderIndex: 2,
  },
  {
    id: "b2000000-0000-4000-8000-000000000006" as EntityId,
    categoryId: "c1000000-0000-4000-8000-000000000001" as EntityId,
    themeId: null,
    prompt: "¿Qué hubiera hecho de modo diferente hoy?",
    periodicity: "daily",
    preferredTimeOfDay: "21:30",
    responseType: "item_list",
    config: { minItems: 3, maxItems: "unlimited" },
    isDefaultSuggested: true,
    orderIndex: 3,
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
  {
    id: "b4000000-0000-4000-8000-000000000001" as EntityId,
    categoryId: "c1000000-0000-4000-8000-000000000001" as EntityId,
    themeId: "e2000000-0000-4000-8000-000000000001" as EntityId,
    prompt:
      "Al final del día, anotá un momento en el que aplicaste esta distinción y cómo te sentiste ⭐",
    periodicity: "daily",
    preferredTimeOfDay: "20:00",
    responseType: "text",
    isDefaultSuggested: false,
    orderIndex: 1,
  },
  {
    id: "b4000000-0000-4000-8000-000000000002" as EntityId,
    categoryId: "c1000000-0000-4000-8000-000000000001" as EntityId,
    themeId: "e2000000-0000-4000-8000-000000000001" as EntityId,
    prompt:
      "Pensá en un momento de ayer en el que algo no salió como esperabas: ¿qué parte estaba bajo tu control y qué parte no, cómo lo reinterpretás desde la perspectiva estoica, qué virtud te pedía practicar y qué cláusula de reserva te llevás para mañana?",
    periodicity: "daily",
    preferredTimeOfDay: "20:00",
    responseType: "text",
    isDefaultSuggested: false,
    orderIndex: 2,
  },
  {
    id: "b4000000-0000-4000-8000-000000000003" as EntityId,
    categoryId: "c1000000-0000-4000-8000-000000000001" as EntityId,
    themeId: "e2000000-0000-4000-8000-000000000001" as EntityId,
    prompt:
      "Imaginá los círculos de Hierocles y elegí un gesto concreto de acercamiento: ¿a quién vas a escuchar, ayudar, acompañar con paciencia o reconocer hoy, y qué te pide ese círculo?",
    periodicity: "daily",
    preferredTimeOfDay: "20:00",
    responseType: "text",
    isDefaultSuggested: false,
    orderIndex: 3,
  },
  {
    id: "b4000000-0000-4000-8000-000000000004" as EntityId,
    categoryId: "c1000000-0000-4000-8000-000000000001" as EntityId,
    themeId: "e2000000-0000-4000-8000-000000000001" as EntityId,
    prompt:
      "Después de la 'Visión desde arriba': ¿qué cambia al mirar tu problema desde esa distancia y qué podrías hacer hoy para vivir más en armonía con la naturaleza o el orden del universo?",
    periodicity: "daily",
    preferredTimeOfDay: "20:00",
    responseType: "text",
    isDefaultSuggested: false,
    orderIndex: 4,
  },
  {
    id: "b4000000-0000-4000-8000-000000000005" as EntityId,
    categoryId: "c1000000-0000-4000-8000-000000000001" as EntityId,
    themeId: "e2000000-0000-4000-8000-000000000001" as EntityId,
    prompt:
      "Pensá en un obstáculo pequeño que enfrentes hoy: ¿cuál es, qué vas a practicar con él y cómo lo reformulás usando la Matriz de Obstáculos y la frase de Epicteto?",
    periodicity: "daily",
    preferredTimeOfDay: "20:00",
    responseType: "text",
    isDefaultSuggested: false,
    orderIndex: 5,
  },
  {
    id: "b4000000-0000-4000-8000-000000000006" as EntityId,
    categoryId: "c1000000-0000-4000-8000-000000000001" as EntityId,
    themeId: "e2000000-0000-4000-8000-000000000001" as EntityId,
    prompt:
      "Pensá en un conflicto o malentendido reciente: ¿qué hechos conocés de verdad, qué estás suponiendo, qué podría estar viviendo la otra persona y cómo elegís responder desde la serenidad y la comprensión?",
    periodicity: "daily",
    preferredTimeOfDay: "20:00",
    responseType: "text",
    isDefaultSuggested: false,
    orderIndex: 6,
  },
];

export const SEED_PROGRAM_STEP_CONTENTS: SeedProgramStepContent[] = [
  {
    id: "d2000000-0000-4000-8000-000000000001" as EntityId,
    questionId: "b4000000-0000-4000-8000-000000000001" as EntityId,
    videoUrl: "https://youtu.be/6jolZrkdsOw?si=JttIr2THqvgmWE0X",
    preparatoryText: `> "La tranquilidad comienza cuando distingues lo que depende de ti y lo que no." — Epicteto

### Ejercicio Práctico
Durante el día, cada vez que algo te genere frustración o ansiedad, hacé una pausa y preguntate:

* **¿Esto depende de mí o no?**
* **Si depende de vos, actuá con claridad.**
* **Si no depende de vos, soltá la tensión y repetí mentalmente: "Elijo la calma."**`,
    createdAt: "2026-09-01T00:00:00.000Z",
  },
  {
    id: "d2000000-0000-4000-8000-000000000002" as EntityId,
    questionId: "b4000000-0000-4000-8000-000000000002" as EntityId,
    videoUrl: "https://youtu.be/nHsUMRcjBiU?si=CQZYkFaWkiD4NlJa",
    preparatoryText: `### Día 2 — Dicotomía del Control

Buenos días/tardes a todos! El desafío de hoy es el siguiente:

Elige un momento del día de ayer en el que algo no haya salido como esperabas (puede ser algo pequeño: un mensaje que no llegó, una demora, una discusión, un error en el trabajo, etc.).

Escribí brevemente tu respuesta a estas tres preguntas:

* 🌀 **¿Qué parte de esta situación estaba bajo tu control y qué parte no lo estaba?**
* ⚖️ **¿Cómo podrías reinterpretar el hecho desde la perspectiva estoica** (por ejemplo: "no es el hecho, sino mi interpretación lo que me causa sufrimiento")**?**
* 🌱 **¿Qué virtud te estaba pidiendo practicar este momento?** (paciencia, humildad, compasión, aceptación, etc.)

Añade la cláusula de reserva estoica para algo que tengas pendiente mañana:

> "Haré todo lo que esté en mi mano para lograr _, si nada lo impide."`,
    createdAt: "2026-09-02T00:00:00.000Z",
  },
  {
    id: "d2000000-0000-4000-8000-000000000003" as EntityId,
    questionId: "b4000000-0000-4000-8000-000000000003" as EntityId,
    videoUrl: "https://youtu.be/N9aBAJ61xSk?si=WTZ8mZ7by6KD4ZfS",
    preparatoryText: `### Día 3 — La Vida en Sociedad

**Actividad Práctica del Día:**

#### Visualizá tus círculos

Cerrá los ojos por un momento e imaginá los círculos de Hierocles:

* En el centro estás tú.
* Luego, tu familia.
* Después, tus amigos y vecinos.
* Más lejos, tu comunidad, tu país.
* Y finalmente, toda la humanidad.

#### Elegí un gesto de acercamiento

Pensá en una acción concreta que puedas hacer hoy para "acercar un círculo".

**Ejemplos:**

* Escuchar con atención a alguien que normalmente ignorás.
* Ayudar a un compañero sin esperar nada a cambio.
* Ser paciente con alguien que te cuesta.
* Agradecer o reconocer a alguien en tu entorno.

> "Se come la vid que produce uvas, y una vez hecho, no busca nada más, sino que pasa a la siguiente" — Marco Aurelio`,
    createdAt: "2026-09-03T00:00:00.000Z",
  },
  {
    id: "d2000000-0000-4000-8000-000000000004" as EntityId,
    questionId: "b4000000-0000-4000-8000-000000000004" as EntityId,
    videoUrl: "https://youtu.be/uqN5Z9tsacg?si=u_4PfZ_71SlJni8r",
    preparatoryText: `### Día 4 — La Conexión con la Naturaleza

Hoy tenemos como tema uno de los más grandes pilares del estoicismo: la conexión con la naturaleza 🌳

La herramienta estoica: la **"Visión desde arriba"** es una visualización guiada diseñada para inculcar un sentido de conjunto y comprender nuestro papel en la naturaleza.

#### 🙏 1. Accedé a la meditación

En forma de audio o de video, desde los siguientes enlaces:

* 🎧 Audio: https://drive.google.com/file/d/1NxOoDh5qsLspeujFl5zWChT4y53tRxPq/view?usp=sharing
* 🎬 Video: https://www.youtube.com/watch?v=az1IKPZ7N2U

#### 🌎 2. Integrá la visualización en tu día

Después de hacer la visualización, respondé por escrito:

* 🌎 ¿Qué cambia al mirar tu problema desde esa distancia?
* 🌠 ¿Qué podrías hacer hoy para vivir más en armonía con la naturaleza o el orden del universo?

📖 Si deseas, compartí con nosotros algo de tu reflexión: nos encanta retroalimentarnos unos de los otros y apoyarnos en esta gran comunidad.

#### 🏞️ 3. Compromiso (opcional)

Elegí una acción concreta y sencilla para hoy que exprese tu conexión con la naturaleza (por ejemplo: caminar al aire libre, agradecer el agua al beberla, evitar un desperdicio).

Les deseo un buen día a todos 🌿`,
    createdAt: "2026-09-04T00:00:00.000Z",
  },
  {
    id: "d2000000-0000-4000-8000-000000000005" as EntityId,
    questionId: "b4000000-0000-4000-8000-000000000005" as EntityId,
    videoUrl: "https://youtu.be/e1IoKJjF4vc?si=6k8yO902AYAFyw8O",
    preparatoryText: `### Día 5 — Deber Estoico y Amor a la Humanidad

**Actividad del día:** pensá en un obstáculo pequeño que enfrentes hoy (algo que te moleste o te frustre) y escribí una sola frase completando esto:

\`Hoy el obstáculo es __, y lo usaré para practicar __\`

Hoy vamos a ver los obstáculos como escalones para crecer y cómo tener una buena interpretación de nuestros pensamientos. Para ampliar este tema, en la sección de audiolibros tenemos **"El Obstáculo es el Camino"** de Ryan Holiday.

La gran pregunta del video es: **¿Cómo encontrar la calma en medio del caos?** Y para responderla los estoicos nos dan los siguientes pasos:

1. Encontrar el Retiro / Santuario de la Mente.
2. Practicar "Prosoché" a través de la Atención Plena Estoica.
3. Convertir los Desafíos en Oportunidades, sabiendo que el Obstáculo es el Camino.
4. Evaluar los Desafíos con un enfoque Sistemático (Matriz de Obstáculos).
5. Aplicar lo aprendido: pensá en un obstáculo y clasificalo en la matriz, escribí la primera impresión que tu juicio te da, después desafiá esa idea con la frase de Epicteto: "No son las cosas las que nos perturban, sino las opiniones que tenemos sobre ellas". Por último, reformulá cómo podés enfrentarlo a través de los principios estoicos.`,
    createdAt: "2026-09-05T00:00:00.000Z",
  },
  {
    id: "d2000000-0000-4000-8000-000000000006" as EntityId,
    questionId: "b4000000-0000-4000-8000-000000000006" as EntityId,
    videoUrl: "https://youtu.be/UKfUL6xGHpo?si=7lXiCqxFrSHSXpid",
    preparatoryText: `### Día 6 — Estoicismo y Relaciones Sociales

**Desafío estoico: comprender antes de reaccionar.**

*Objetivo:* reflexionar sobre cómo interpretamos las acciones de los demás y aprender a responder con mayor comprensión, empatía y serenidad, sin dejar que nuestras primeras impresiones definan nuestras relaciones.

#### 🪞 Paso 1. Identificá

Pensá en una situación reciente en la que hayas tenido un conflicto, un malentendido o una reacción negativa con otra persona.

Puede ser una conversación incómoda, un mensaje que no recibiste, una crítica que te molestó o una actitud que interpretaste como indiferencia.

Escribí brevemente qué sucedió y cómo te sentiste.

> Ejemplo: «Sentí que un amigo no me tenía en cuenta porque no me respondió un mensaje».

#### 🧠 Paso 2. Cuestioná tu interpretación

Antes de juzgar a la otra persona, detenete y reflexioná:

* ¿Qué hechos conozco realmente y qué cosas estoy suponiendo?
* ¿Estoy interpretando sus acciones desde mis expectativas o desde lo que realmente ocurrió?
* ¿Qué otras explicaciones podrían existir para su comportamiento?

#### 🤝 Paso 3. Practicá la empatía estoica

Ahora intentá mirar la situación desde otra perspectiva:

* ¿Qué podría estar viviendo o sintiendo la otra persona que yo desconozco?
* ¿Cómo cambiaría mi reacción si decidiera no asumir automáticamente lo peor?
* ¿Cómo puedo expresar lo que siento sin atacar, juzgar ni dejar de respetarme?

Escribí una frase que represente cómo elegirías actuar desde la serenidad y la comprensión.

#### 🌱 Paso 4. Llevalo a la práctica

Para cerrar, respondé:

* ¿Qué descubrí sobre mi forma de interpretar las acciones de los demás?
* ¿Qué puedo hacer diferente la próxima vez que surja un malentendido?
* ¿Qué pequeña acción puedo poner en práctica para mejorar una de mis relaciones?

No hace falta resolver todos tus conflictos hoy. El desafío consiste en empezar a relacionarte con más conciencia, sin dar por ciertas todas tus primeras interpretaciones.

¡Buen fin de semana a todos!`,
    createdAt: "2026-09-06T00:00:00.000Z",
  },
];

export const SEED_PROGRAM_STEP_RESOURCES: SeedProgramStepResource[] = [
  {
    id: "f2000000-0000-4000-8000-000000000001" as EntityId,
    stepContentId: "d2000000-0000-4000-8000-000000000004" as EntityId,
    kind: "audio",
    label: 'Audio: Meditación "Visión desde arriba"',
    url: "https://drive.google.com/file/d/1NxOoDh5qsLspeujFl5zWChT4y53tRxPq/view?usp=sharing",
    orderIndex: 1,
    createdAt: "2026-09-04T00:00:00.000Z",
  },
  {
    id: "f2000000-0000-4000-8000-000000000002" as EntityId,
    stepContentId: "d2000000-0000-4000-8000-000000000004" as EntityId,
    kind: "video",
    label: 'Video: Meditación "Visión desde arriba"',
    url: "https://www.youtube.com/watch?v=az1IKPZ7N2U",
    orderIndex: 2,
    createdAt: "2026-09-04T00:00:00.000Z",
  },
];
