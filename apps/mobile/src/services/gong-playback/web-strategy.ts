import type { FallbackAudioPlayer, IGongPlaybackStrategy } from "./types";

export class WebGongPlaybackStrategy implements IGongPlaybackStrategy {
  async preload(_source: number | string): Promise<void> {
    // Web uses HTMLAudio / expo-audio player
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
