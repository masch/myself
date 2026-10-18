import { useEffect, useMemo, useState } from "react";
import { useSQLiteContext } from "expo-sqlite";
import type {
  EntityId,
  ProgramStepContent,
  ProgramStepResource,
  ReflectionQuestion,
} from "@myself/shared";
import type { ReflectionRepositoryPort } from "../domain/ports/reflection.repository.port";
import { SqliteReflectionRepository } from "../infrastructure/sqlite-reflection.repository";

/** Read-only program data shown before enrolling in a thematic cohort. */
export interface ProgramPreviewData {
  steps: ReflectionQuestion[];
  contents: ProgramStepContent[];
  resources: ProgramStepResource[];
}

/** Preview data plus the degraded read failure, when a bulk read rejected. */
export interface ProgramPreviewResult extends ProgramPreviewData {
  error: Error | null;
}

export const EMPTY_PROGRAM_PREVIEW_DATA: ProgramPreviewData = {
  steps: [],
  contents: [],
  resources: [],
};

export type ProgramPreviewRepository = Pick<
  ReflectionRepositoryPort,
  | "getQuestionsForTheme"
  | "getProgramStepContentsForTheme"
  | "getStepResourcesForTheme"
>;

/**
 * Reads every visible piece of a program in one bulk query per data kind.
 *
 * The preview is optional data: a failed read degrades to the empty preview and
 * stays observable in the console, so opening it can never fail the reflections
 * screen. This mirrors `loadStepResourcesForQuestion`.
 */
export async function loadProgramPreview(
  repository: ProgramPreviewRepository,
  themeId: EntityId,
): Promise<ProgramPreviewResult> {
  try {
    const [steps, contents, resources] = await Promise.all([
      repository.getQuestionsForTheme(themeId),
      repository.getProgramStepContentsForTheme(themeId),
      repository.getStepResourcesForTheme(themeId),
    ]);
    return { steps, contents, resources, error: null };
  } catch (error) {
    console.error("Failed to load program preview for theme:", themeId, error);
    return {
      ...EMPTY_PROGRAM_PREVIEW_DATA,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Builds a per-theme preview loader. Each theme is read at most once per loader
 * lifetime, and concurrent requests for the same theme share one read, so
 * reopening the same preview inside a session never refetches it.
 */
export function createProgramPreviewLoader(
  repository: ProgramPreviewRepository,
): (themeId: EntityId) => Promise<ProgramPreviewResult> {
  const cache = new Map<EntityId, Promise<ProgramPreviewResult>>();

  return (themeId: EntityId) => {
    const cached = cache.get(themeId);
    if (cached) return cached;

    const pending = loadProgramPreview(repository, themeId);
    cache.set(themeId, pending);
    return pending;
  };
}

export interface ProgramPreviewState extends ProgramPreviewResult {
  isLoading: boolean;
}

interface LoadedProgramPreview extends ProgramPreviewResult {
  themeId: EntityId;
}

/**
 * Loads the read-only preview of a program so a user who is not enrolled can
 * browse it. Pass `null` when no preview is open.
 */
export function useProgramPreview(
  themeId: EntityId | null,
): ProgramPreviewState {
  const db = useSQLiteContext();
  const repository = useMemo(() => new SqliteReflectionRepository(db), [db]);
  const loadPreview = useMemo(
    () => createProgramPreviewLoader(repository),
    [repository],
  );

  // Loading is derived from the loaded theme id instead of set synchronously in
  // the effect, so switching themes recomputes it during render.
  const [loaded, setLoaded] = useState<LoadedProgramPreview | null>(null);

  useEffect(() => {
    if (!themeId) return;

    let isCurrentTheme = true;
    void loadPreview(themeId).then((result) => {
      if (!isCurrentTheme) return;
      setLoaded({ ...result, themeId });
    });

    return () => {
      isCurrentTheme = false;
    };
  }, [themeId, loadPreview]);

  if (!themeId) {
    return { ...EMPTY_PROGRAM_PREVIEW_DATA, error: null, isLoading: false };
  }

  if (loaded?.themeId === themeId) {
    return {
      steps: loaded.steps,
      contents: loaded.contents,
      resources: loaded.resources,
      error: loaded.error,
      isLoading: false,
    };
  }

  return { ...EMPTY_PROGRAM_PREVIEW_DATA, error: null, isLoading: true };
}
