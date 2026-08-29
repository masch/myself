import { NativeModule, registerWebModule } from "expo";
import type {
  MeditationSessionEvents,
  StartSessionOptions,
} from "./MeditationSession.types";

class MeditationSessionModule extends NativeModule<MeditationSessionEvents> {
  startSession(_options: StartSessionOptions): boolean {
    return true;
  }

  stopSession(): boolean {
    return true;
  }

  isSessionActive(): boolean {
    return false;
  }
}

export default registerWebModule(MeditationSessionModule, "MeditationSession");
