export interface SessionParams {
  targetDate: Date;
}

export interface IMeditationSessionService {
  startSession(params: SessionParams): Promise<void>;
  stopSession(): Promise<void>;
  subscribeCompletion(onCompleted: () => void): () => void;
  subscribeError(onError: (error: string) => void): () => void;
}
