export interface StartSessionOptions {
  targetEpochMs: number;
  targetTimeFormatted: string;
}

export type MeditationSessionEvents = {
  onSessionCompleted: () => void;
  onSessionError: (event: { error: string }) => void;
};
