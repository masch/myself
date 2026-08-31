import { NativeModule, requireNativeModule } from "expo";
import type {
  MeditationSessionEvents,
  StartSessionOptions,
} from "./MeditationSession.types";

declare class MeditationSessionModuleType extends NativeModule<MeditationSessionEvents> {
  startSession(options: StartSessionOptions): boolean;
  stopSession(): boolean;
  isSessionActive(): boolean;
}

let MeditationSessionModule: MeditationSessionModuleType;

try {
  MeditationSessionModule =
    requireNativeModule<MeditationSessionModuleType>("MeditationSession");
} catch {
  // Safe fallback when running on Web or environment without native binary
  MeditationSessionModule = {
    startSession: () => false,
    stopSession: () => false,
    isSessionActive: () => false,
    addListener: () => ({ remove: () => {} }),
    removeListeners: () => {},
  } as unknown as MeditationSessionModuleType;
}

export default MeditationSessionModule;
