import type { FallbackAudioPlayer, IGongPlaybackStrategy } from "./types";

export class IosGongPlaybackStrategy implements IGongPlaybackStrategy {
  async preload(_source: number | string): Promise<void> {
    // iOS uses expo-audio player which manages its own asset buffering
  }

  async playGong(
    _source: number | string,
    fallbackPlayer: FallbackAudioPlayer | null,
    _volume: number,
  ): Promise<void> {
    if (fallbackPlayer) {
      try {
        await fallbackPlayer.seekTo(0);
      } catch {}
      fallbackPlayer.play();
    }
  }
}
