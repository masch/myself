import { describe, expect, it, mock, spyOn } from "bun:test";
import type {
  EntityId,
  ProgramStepContent,
  ProgramStepResource,
  ReflectionQuestion,
} from "@myself/shared";

// The hook module imports `expo-sqlite` at the top level. Mock the native module
// so importing the loader helpers used by the hook stays pure.
mock.module("expo-sqlite", () => ({
  useSQLiteContext: () => ({}),
}));

const { createProgramPreviewLoader, loadProgramPreview } =
  await import("../use-program-preview");

const dichotomyThemeId = "e2000000-0000-4000-8000-000000000001" as EntityId;
const resilienceThemeId = "e1000000-0000-4000-8000-000000000001" as EntityId;

const question: ReflectionQuestion = {
  id: "b4000000-0000-4000-8000-000000000001" as EntityId,
  categoryId: "c1000000-0000-4000-8000-000000000001" as EntityId,
  themeId: dichotomyThemeId,
  prompt:
    "Al final del día, anotá un momento en el que aplicaste esta distinción",
  periodicity: "daily",
  preferredTimeOfDay: "20:00",
  responseType: "text",
  isDefaultSuggested: false,
  orderIndex: 1,
  createdAt: "2026-09-01T00:00:00.000Z",
};

const content: ProgramStepContent = {
  id: "d2000000-0000-4000-8000-000000000001" as EntityId,
  questionId: question.id,
  videoUrl: "https://youtu.be/6jolZrkdsOw?si=JttIr2THqvgmWE0X",
  preparatoryText: "Consigna del día 1",
  createdAt: "2026-09-01T00:00:00.000Z",
};

const resource: ProgramStepResource = {
  id: "f2000000-0000-4000-8000-000000000001" as EntityId,
  stepContentId: content.id,
  kind: "video",
  label: "Video: Meditación desde arriba",
  url: "https://www.youtube.com/watch?v=az1IKPZ7N2U",
  orderIndex: 1,
  createdAt: "2026-09-04T00:00:00.000Z",
};

function createStubRepository() {
  const calls = {
    questions: [] as EntityId[],
    contents: [] as EntityId[],
    resources: [] as EntityId[],
  };

  return {
    calls,
    async getQuestionsForTheme(themeId: EntityId) {
      calls.questions.push(themeId);
      return [question];
    },
    async getProgramStepContentsForTheme(themeId: EntityId) {
      calls.contents.push(themeId);
      return [content];
    },
    async getStepResourcesForTheme(themeId: EntityId) {
      calls.resources.push(themeId);
      return [resource];
    },
  };
}

describe("createProgramPreviewLoader", () => {
  it("loads each theme once and serves reopening the same preview from the cache", async () => {
    const repository = createStubRepository();
    const load = createProgramPreviewLoader(repository);

    const first = await load(dichotomyThemeId);
    const second = await load(dichotomyThemeId);
    const third = await load(dichotomyThemeId);

    expect(first.steps).toEqual([question]);
    expect(first.contents).toEqual([content]);
    expect(first.resources).toEqual([resource]);
    expect(first.error).toBeNull();
    expect(second).toBe(first);
    expect(third).toBe(first);

    expect(repository.calls.questions).toEqual([dichotomyThemeId]);
    expect(repository.calls.contents).toEqual([dichotomyThemeId]);
    expect(repository.calls.resources).toEqual([dichotomyThemeId]);

    await load(resilienceThemeId);
    expect(repository.calls.questions).toEqual([
      dichotomyThemeId,
      resilienceThemeId,
    ]);
    expect(repository.calls.contents).toEqual([
      dichotomyThemeId,
      resilienceThemeId,
    ]);
    expect(repository.calls.resources).toEqual([
      dichotomyThemeId,
      resilienceThemeId,
    ]);
  });

  it("dedupes concurrent loads of the same theme into a single read", async () => {
    const repository = createStubRepository();
    const load = createProgramPreviewLoader(repository);

    await Promise.all([
      load(dichotomyThemeId),
      load(dichotomyThemeId),
      load(dichotomyThemeId),
    ]);

    expect(repository.calls.questions).toEqual([dichotomyThemeId]);
    expect(repository.calls.contents).toEqual([dichotomyThemeId]);
    expect(repository.calls.resources).toEqual([dichotomyThemeId]);
  });

  it("degrades to empty data and logs when a read rejects", async () => {
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    const repository = {
      async getQuestionsForTheme(): Promise<ReflectionQuestion[]> {
        throw new Error("preview read failed");
      },
      async getProgramStepContentsForTheme(): Promise<ProgramStepContent[]> {
        throw new Error("preview read failed");
      },
      async getStepResourcesForTheme(): Promise<ProgramStepResource[]> {
        throw new Error("preview read failed");
      },
    };
    const load = createProgramPreviewLoader(repository);

    const result = await load(dichotomyThemeId);

    expect(result.steps).toEqual([]);
    expect(result.contents).toEqual([]);
    expect(result.resources).toEqual([]);
    expect(result.error?.message).toBe("preview read failed");
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });

  it("keeps the reads that resolved when only one bulk read rejects", async () => {
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    const repository = {
      async getQuestionsForTheme(): Promise<ReflectionQuestion[]> {
        return [question];
      },
      async getProgramStepContentsForTheme(): Promise<ProgramStepContent[]> {
        throw new Error("contents read failed");
      },
      async getStepResourcesForTheme(): Promise<ProgramStepResource[]> {
        return [resource];
      },
    };

    const result = await loadProgramPreview(repository, dichotomyThemeId);

    expect(result.steps).toEqual([question]);
    expect(result.contents).toEqual([]);
    expect(result.resources).toEqual([resource]);
    expect(result.error?.message).toBe("contents read failed");
    expect(errorSpy).toHaveBeenCalledTimes(1);

    errorSpy.mockRestore();
  });

  it("retries a degraded theme instead of caching the failure, and caches the success", async () => {
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    const calls = { resources: 0 };
    let failResources = true;
    const repository = {
      async getQuestionsForTheme(): Promise<ReflectionQuestion[]> {
        return [question];
      },
      async getProgramStepContentsForTheme(): Promise<ProgramStepContent[]> {
        return [content];
      },
      async getStepResourcesForTheme(): Promise<ProgramStepResource[]> {
        calls.resources += 1;
        if (failResources) throw new Error("resources read failed");
        return [resource];
      },
    };
    const load = createProgramPreviewLoader(repository);

    const degraded = await load(dichotomyThemeId);
    expect(degraded.error?.message).toBe("resources read failed");
    expect(degraded.resources).toEqual([]);
    expect(degraded.steps).toEqual([question]);
    expect(degraded.contents).toEqual([content]);

    failResources = false;
    const recovered = await load(dichotomyThemeId);
    expect(recovered.error).toBeNull();
    expect(recovered.steps).toEqual([question]);
    expect(recovered.contents).toEqual([content]);
    expect(recovered.resources).toEqual([resource]);

    const cached = await load(dichotomyThemeId);
    expect(cached).toBe(recovered);
    expect(calls.resources).toBe(2);

    errorSpy.mockRestore();
  });
});
