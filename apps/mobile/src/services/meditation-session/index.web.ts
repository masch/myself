import type { IMeditationSessionService } from "./types";
import { WebMeditationSessionService } from "./web-strategy";

export const MeditationSessionService: IMeditationSessionService =
  new WebMeditationSessionService();

export * from "./types";
