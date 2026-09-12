import { playAlarmSound, stopAlarmSound } from "@/modules/meditation-session";
import { Asset } from "expo-asset";
import type { FallbackAudioPlayer, IGongPlaybackStrategy } from "./types";

export class AndroidGongPlaybackStrategy implements IGongPlaybackStrategy {
  private assetUriCache = new Map<number | string, string>();

  async resolveAssetUri(source: number | string): Promise<string | null> {
    if (this.assetUriCache.has(source)) {
      return this.assetUriCache.get(source)!;
    }
    try {
      const asset = Asset.fromModule(source);
      await asset.downloadAsync();
      const uri = asset.localUri ?? asset.uri;
      if (uri) {
        this.assetUriCache.set(source, uri);
        return uri;
      }
    } catch (err) {
      console.warn("Failed to resolve asset URI for alarm channel:", err);
    }
    return null;
  }

  async preload(source: number | string): Promise<void> {
    await this.resolveAssetUri(source);
  }

  async playGong(
    source: number | string,
    fallbackPlayer: FallbackAudioPlayer | null,
    volume: number,
  ): Promise<void> {
    const uri = await this.resolveAssetUri(source);
    if (uri) {
      const played = playAlarmSound(uri, volume);
      if (played) {
        return;
      }
    }

    if (fallbackPlayer) {
      try {
        await fallbackPlayer.seekTo(0);
      } catch {}
      fallbackPlayer.play();
    }
  }

  async stopGong(
    ...fallbackPlayers: (FallbackAudioPlayer | null | undefined)[]
  ): Promise<void> {
    stopAlarmSound();
    for (const player of fallbackPlayers) {
      try {
        player?.pause?.();
      } catch {}
    }
  }
}
