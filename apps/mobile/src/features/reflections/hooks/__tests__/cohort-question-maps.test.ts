import { describe, expect, it, mock, spyOn } from "bun:test";
import type {
  EntityId,
  ProgramStepContent,
  ProgramStepResource,
  ReflectionQuestion,
} from "@myself/shared";

// The helper lives next to the hook, whose module imports `expo-sqlite` at the
// top level. Mock the native module so importing the helper stays pure.
mock.module("expo-sqlite", () => ({
  useSQLiteContext: () => ({}),
}));

const { loadCohortQuestionMaps } = await import("../use-theme-cohort");

const themeId = "e2000000-0000-4000-8000-000000000001" as EntityId;
const otherThemeId = "e1000000-0000-4000-8000-000000000001" as EntityId;

const makeQuestion = (suffix: string, orderIndex: number): ReflectionQuestion =>
  ({
    id: `b4000000-0000-4000-8000-00000000000${suffix}` as EntityId,
    categoryId: "c1000000-0000-4000-8000-000000000001" as EntityId,
    themeId,
    prompt: `Pregunta ${orderIndex}`,
    periodicity: "daily",
    preferredTimeOfDay: "20:00",
    responseType: "text",
    isDefaultSuggested: false,
    orderIndex,
    createdAt: "2026-09-01T00:00:00.000Z",
  }) as ReflectionQuestion;

const question1 = makeQuestion("1", 1);
const question2 = makeQuestion("2", 2);
const question3 = makeQuestion("3", 3);

const makeContent = (
  suffix: string,
  questionId: EntityId,
): ProgramStepContent => ({
  id: `d2000000-0000-4000-8000-00000000000${suffix}` as EntityId,
  questionId,
  videoUrl: `https://youtu.be/video${suffix}`,
  preparatoryText: `Consigna ${suffix}`,
  createdAt: "2026-09-01T00:00:00.000Z",
});

const content1 = makeContent("1", question1.id);
const content3 = makeContent("3", question3.id);

const makeResource = (
  suffix: string,
  stepContentId: EntityId,
): ProgramStepResource => ({
  id: `f2000000-0000-4000-8000-00000000000${suffix}` as EntityId,
  stepContentId,
  kind: "audio",
  label: `Recurso ${suffix}`,
  url: `https://example.com/resource${suffix}`,
  orderIndex: 1,
  createdAt: "2026-09-04T00:00:00.000Z",
});

const resource1 = makeResource("1", content1.id);
const resource3 = makeResource("3", content3.id);
// Belongs to no step content of this theme: it must not leak into any map.
const orphanResource = makeResource(
  "9",
  "d9999999-0000-4000-8000-000000000009" as EntityId,
);

function createStubRepository(options: {
  contents: ProgramStepContent[];
  resources?: ProgramStepResource[];
  failContents?: boolean;
  failResources?: boolean;
}) {
  const calls = {
    contents: [] as EntityId[],
    resources: [] as EntityId[],
  };

  return {
    calls,
    async getProgramStepContentsForTheme(id: EntityId) {
      calls.contents.push(id);
      if (options.failContents) throw new Error("contents read failed");
      return options.contents;
    },
    async getStepResourcesForTheme(id: EntityId) {
      calls.resources.push(id);
      if (options.failResources) throw new Error("resources read failed");
      return options.resources ?? [];
    },
  };
}

describe("loadCohortQuestionMaps", () => {
  it("does one bulk read per theme regardless of question count and keys the maps by question id", async () => {
    const repository = createStubRepository({
      contents: [content1, content3],
      resources: [resource1, orphanResource, resource3],
    });

    const { stepContentsMap, stepResourcesMap } = await loadCohortQuestionMaps(
      repository,
      themeId,
      [question1, question2, question3],
    );

    expect(repository.calls.contents).toEqual([themeId]);
    expect(repository.calls.resources).toEqual([themeId]);

    expect(stepContentsMap[question1.id]).toEqual(content1);
    expect(stepContentsMap[question2.id]).toBeNull();
    expect(stepContentsMap[question3.id]).toEqual(content3);

    // Resources resolve through their `stepContentId`, never the question id.
    expect(stepResourcesMap[question1.id]).toEqual([resource1]);
    expect(stepResourcesMap[question2.id]).toEqual([]);
    expect(stepResourcesMap[question3.id]).toEqual([resource3]);
  });

  it("does one bulk read per theme when several themes load together", async () => {
    const repository = createStubRepository({ contents: [content1] });

    await loadCohortQuestionMaps(repository, themeId, [question1, question2]);
    await loadCohortQuestionMaps(repository, otherThemeId, [question3]);

    expect(repository.calls.contents).toEqual([themeId, otherThemeId]);
    expect(repository.calls.resources).toEqual([themeId, otherThemeId]);
  });

  it("degrades the resources of every question to empty when the resource read rejects", async () => {
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    const repository = createStubRepository({
      contents: [content1, content3],
      failResources: true,
    });

    const { stepContentsMap, stepResourcesMap } = await loadCohortQuestionMaps(
      repository,
      themeId,
      [question1, question2, question3],
    );

    expect(stepContentsMap[question1.id]).toEqual(content1);
    expect(stepContentsMap[question3.id]).toEqual(content3);
    expect(stepResourcesMap[question1.id]).toEqual([]);
    expect(stepResourcesMap[question2.id]).toEqual([]);
    expect(stepResourcesMap[question3.id]).toEqual([]);
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });

  it("degrades contents to null but still resolves the resources read when the contents read rejects", async () => {
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    const repository = createStubRepository({
      contents: [],
      resources: [resource1, resource3],
      failContents: true,
    });

    const { stepContentsMap, stepResourcesMap } = await loadCohortQuestionMaps(
      repository,
      themeId,
      [question1, question2, question3],
      { currentQuestionId: question1.id, currentStepContent: content1 },
    );

    expect(stepContentsMap[question1.id]).toEqual(content1);
    expect(stepContentsMap[question2.id]).toBeNull();
    expect(stepContentsMap[question3.id]).toBeNull();
    expect(repository.calls.resources).toEqual([themeId]);
    expect(stepResourcesMap[question1.id]).toEqual([resource1]);
    expect(stepResourcesMap[question2.id]).toEqual([]);
    expect(stepResourcesMap[question3.id]).toEqual([]);
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });

  it("prefers the already-loaded current step content over the bulk read", async () => {
    const repository = createStubRepository({
      contents: [content1, content3],
      resources: [resource1, resource3],
    });
    const override: ProgramStepContent = {
      ...content1,
      preparatoryText: "Consigna fresca del paso actual",
    };

    const { stepContentsMap, stepResourcesMap } = await loadCohortQuestionMaps(
      repository,
      themeId,
      [question1, question2, question3],
      { currentQuestionId: question1.id, currentStepContent: override },
    );

    expect(stepContentsMap[question1.id]).toEqual(override);
    expect(stepContentsMap[question3.id]).toEqual(content3);
    expect(stepResourcesMap[question1.id]).toEqual([resource1]);
  });
});
