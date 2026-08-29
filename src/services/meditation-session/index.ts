import { Platform } from "react-native";
import { AndroidMeditationSessionService } from "./android-strategy";
import { IosMeditationSessionService } from "./ios-strategy";
import type { IMeditationSessionService, SessionParams } from "./types";
import { WebMeditationSessionService } from "./web-strategy";

class LazyMeditationSessionService implements IMeditationSessionService {
  private delegate: IMeditationSessionService | null = null;

  private getService(): IMeditationSessionService {
    if (!this.delegate) {
      if (Platform.OS === "android") {
        this.delegate = new AndroidMeditationSessionService();
      } else if (Platform.OS === "ios") {
        this.delegate = new IosMeditationSessionService();
      } else {
        this.delegate = new WebMeditationSessionService();
      }
    }
    return this.delegate;
  }

  startSession(params: SessionParams): Promise<void> {
    return this.getService().startSession(params);
  }

  stopSession(): Promise<void> {
    return this.getService().stopSession();
  }

  subscribeCompletion(onCompleted: () => void): () => void {
    return this.getService().subscribeCompletion(onCompleted);
  }
}

export const MeditationSessionService: IMeditationSessionService =
  new LazyMeditationSessionService();

export * from "./types";
