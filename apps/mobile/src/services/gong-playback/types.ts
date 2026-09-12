export interface FallbackAudioPlayer {
  play: () => void;
  pause?: () => void;
  seekTo: (pos: number) => Promise<void>;
}

export interface IGongPlaybackStrategy {
  preload(source: number | string): Promise<void>;
  playGong(
    source: number | string,
    fallbackPlayer: FallbackAudioPlayer | null,
    volume: number,
  ): Promise<void>;
  stopGong(
    ...fallbackPlayers: (FallbackAudioPlayer | null | undefined)[]
  ): Promise<void>;
}
