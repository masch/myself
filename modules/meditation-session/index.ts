import MeditationSessionModule from "./src/MeditationSessionModule";
import type {
  MeditationSessionEvents,
  StartSessionOptions,
} from "./src/MeditationSession.types";

export function startMeditationSession(options: StartSessionOptions): boolean {
  try {
    return MeditationSessionModule.startSession(options);
  } catch {
    return false;
  }
}

export function stopMeditationSession(): boolean {
  try {
    return MeditationSessionModule.stopSession();
  } catch {
    return false;
  }
}

export function isMeditationSessionActive(): boolean {
  try {
    return MeditationSessionModule.isSessionActive();
  } catch {
    return false;
  }
}

export function addSessionCompletedListener(listener: () => void) {
  try {
    return MeditationSessionModule.addListener("onSessionCompleted", listener);
  } catch {
    return { remove: () => {} };
  }
}

export function addSessionErrorListener(
  listener: (event: { error: string }) => void,
) {
  try {
    return MeditationSessionModule.addListener("onSessionError", listener);
  } catch {
    return { remove: () => {} };
  }
}

export { MeditationSessionModule };
export type { StartSessionOptions, MeditationSessionEvents };
