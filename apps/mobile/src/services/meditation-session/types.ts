import type { DateTime } from "@myself/shared";

export interface SessionParams {
  targetDate: DateTime;
}

export interface IMeditationSessionService {
  startSession(params: SessionParams): Promise<void>;
  stopSession(): Promise<void>;
  subscribeCompletion(onCompleted: () => void): () => void;
  subscribeError(onError: (error: string) => void): () => void;
}
