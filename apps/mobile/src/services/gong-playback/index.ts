import { Platform } from "react-native";
import { AndroidGongPlaybackStrategy } from "./android-strategy";
import { IosGongPlaybackStrategy } from "./ios-strategy";
import type { FallbackAudioPlayer, IGongPlaybackStrategy } from "./types";
import { WebGongPlaybackStrategy } from "./web-strategy";

export class LazyGongPlaybackService implements IGongPlaybackStrategy {
  private delegate: IGongPlaybackStrategy | null = null;
  private currentPlatform: string | null = null;

  private getStrategy(): IGongPlaybackStrategy {
    if (!this.delegate || this.currentPlatform !== Platform.OS) {
      this.currentPlatform = Platform.OS;
      if (Platform.OS === "android") {
        this.delegate = new AndroidGongPlaybackStrategy();
      } else if (Platform.OS === "ios") {
        this.delegate = new IosGongPlaybackStrategy();
      } else {
        this.delegate = new WebGongPlaybackStrategy();
      }
    }
    return this.delegate;
  }

  preload(source: number | string): Promise<void> {
    return this.getStrategy().preload(source);
  }

  playGong(
    source: number | string,
    fallbackPlayer: FallbackAudioPlayer | null,
    volume: number,
  ): Promise<void> {
    return this.getStrategy().playGong(source, fallbackPlayer, volume);
  }

  stopGong(
    ...fallbackPlayers: (FallbackAudioPlayer | null | undefined)[]
  ): Promise<void> {
    return this.getStrategy().stopGong(...fallbackPlayers);
  }
}

export const GongPlaybackService: IGongPlaybackStrategy =
  new LazyGongPlaybackService();

export * from "./types";
export { AndroidGongPlaybackStrategy } from "./android-strategy";
export { IosGongPlaybackStrategy } from "./ios-strategy";
export { WebGongPlaybackStrategy } from "./web-strategy";
