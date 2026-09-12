import { NativeModule, requireNativeModule } from "expo";
import type {
  MeditationSessionEvents,
  StartSessionOptions,
} from "./MeditationSession.types";

declare class MeditationSessionModuleType extends NativeModule<MeditationSessionEvents> {
  startSession(options: StartSessionOptions): boolean;
  stopSession(): boolean;
  isSessionActive(): boolean;
  playAlarmSound(uri: string, volume: number): boolean;
  stopAlarmSound(): boolean;
}

export function createFallbackMeditationSessionModule(): MeditationSessionModuleType {
  return {
    startSession: () => false,
    stopSession: () => false,
    isSessionActive: () => false,
    playAlarmSound: () => false,
    stopAlarmSound: () => false,
    addListener: () => ({ remove: () => {} }),
    removeListener: () => {},
    removeAllListeners: () => {},
  } as unknown as MeditationSessionModuleType;
}

let MeditationSessionModule: MeditationSessionModuleType;

try {
  MeditationSessionModule =
    requireNativeModule<MeditationSessionModuleType>("MeditationSession");
} catch {
  // Safe fallback when running on Web or environment without native binary
  MeditationSessionModule = createFallbackMeditationSessionModule();
}

export default MeditationSessionModule;
