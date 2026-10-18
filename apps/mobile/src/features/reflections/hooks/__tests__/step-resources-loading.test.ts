import { describe, expect, it, mock, spyOn } from "bun:test";
import type { EntityId, ProgramStepResource } from "@myself/shared";

// The helper lives next to the hook, whose module imports `expo-sqlite` at the
// top level. Mock the native module so importing the helper stays pure.
mock.module("expo-sqlite", () => ({
  useSQLiteContext: () => ({}),
}));

const { loadStepResourcesForQuestion } = await import("../use-theme-cohort");

const questionId = "b4000000-0000-4000-8000-000000000004" as EntityId;

const resource: ProgramStepResource = {
  id: "f2000000-0000-4000-8000-000000000001" as EntityId,
  stepContentId: "d2000000-0000-4000-8000-000000000004" as EntityId,
  kind: "audio",
  label: "Audio: Meditación desde arriba",
  url: "https://example.com/audio",
  orderIndex: 1,
  createdAt: "2026-09-04T00:00:00.000Z",
};

describe("loadStepResourcesForQuestion", () => {
  it("degrades to an empty list when the resource read rejects", async () => {
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    const repository = {
      getStepResourcesForQuestion: async (_questionId: EntityId) => {
        throw new Error("resources read failed");
      },
    };

    const result = await loadStepResourcesForQuestion(repository, questionId);
    expect(result).toEqual([]);
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });

  it("passes the resources through when the resource read resolves", async () => {
    const repository = {
      getStepResourcesForQuestion: async (_questionId: EntityId) => [resource],
    };

    const result = await loadStepResourcesForQuestion(repository, questionId);
    expect(result).toEqual([resource]);
  });
});
