export interface StartSessionOptions {
  targetEpochMs: number;
  targetTimeFormatted: string;
}

export type MeditationSessionEvents = {
  onSessionCompleted: () => void;
};
