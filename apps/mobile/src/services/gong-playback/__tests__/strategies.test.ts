import { describe, expect, it, mock, beforeEach } from "bun:test";
import { Asset } from "expo-asset";
import { Platform } from "react-native";
import { mockMeditationSession } from "../../../../test-setup";
import { AndroidGongPlaybackStrategy } from "../android-strategy";
import { IosGongPlaybackStrategy } from "../ios-strategy";
import { WebGongPlaybackStrategy } from "../web-strategy";
import { GongPlaybackService } from "../index";

describe("Gong Playback Strategies", () => {
  const mockPlay = mock(() => {});
  const mockSeekTo = mock(async () => {});
  const createMockPlayer = () => ({
    play: mockPlay,
    seekTo: mockSeekTo,
  });

  beforeEach(() => {
    mockPlay.mockClear();
    mockSeekTo.mockClear();
    mockMeditationSession.playAlarmSound.mockClear();
  });

  describe("AndroidGongPlaybackStrategy", () => {
    it("resolves and caches asset URI correctly", async () => {
      const strategy = new AndroidGongPlaybackStrategy();
      const uri1 = await strategy.resolveAssetUri(1);
      expect(uri1).toBe("file:///mock-sound.m4a");

      // Cached hit
      const uri2 = await strategy.resolveAssetUri(1);
      expect(uri2).toBe("file:///mock-sound.m4a");
    });

    it("preloads asset URI without error", async () => {
      const strategy = new AndroidGongPlaybackStrategy();
      await strategy.preload(1);
      const cachedUri = await strategy.resolveAssetUri(1);
      expect(cachedUri).toBe("file:///mock-sound.m4a");
    });

    it("handles asset resolution failure gracefully", async () => {
      const originalFromModule = Asset.fromModule;
      Asset.fromModule = mock(() => {
        throw new Error("Asset load failure");
      }) as any;

      const strategy = new AndroidGongPlaybackStrategy();
      const uri = await strategy.resolveAssetUri("nonexistent-sound");
      expect(uri).toBeNull();

      Asset.fromModule = originalFromModule;
    });

    it("plays sound via playAlarmSound on Android and skips fallback on success", async () => {
      const strategy = new AndroidGongPlaybackStrategy();
      const player = createMockPlayer();

      await strategy.playGong(1, player, 0.9);

      expect(mockMeditationSession.playAlarmSound).toHaveBeenCalledWith(
        "file:///mock-sound.m4a",
        0.9,
      );
      expect(mockPlay).not.toHaveBeenCalled();
    });

    it("falls back to expo-audio when native alarm playback returns false", async () => {
      mockMeditationSession.playAlarmSound.mockImplementationOnce(() => false);
      const strategy = new AndroidGongPlaybackStrategy();
      const player = createMockPlayer();

      await strategy.playGong(1, player, 0.9);

      expect(mockMeditationSession.playAlarmSound).toHaveBeenCalled();
      expect(mockPlay).toHaveBeenCalledTimes(1);
    });

    it("falls back to expo-audio when asset uri cannot be resolved", async () => {
      const originalFromModule = Asset.fromModule;
      Asset.fromModule = (() => {
        throw new Error("Cannot resolve");
      }) as any;

      const strategy = new AndroidGongPlaybackStrategy();
      const player = createMockPlayer();

      await strategy.playGong("unresolvable-key", player, 0.9);

      expect(mockPlay).toHaveBeenCalledTimes(1);
      Asset.fromModule = originalFromModule;
    });

    it("handles null fallback player safely", async () => {
      mockMeditationSession.playAlarmSound.mockImplementationOnce(() => false);
      const strategy = new AndroidGongPlaybackStrategy();
      await strategy.playGong(1, null, 0.9);
      // Should complete without throwing
    });

    it("handles seekTo errors gracefully in fallback player", async () => {
      mockMeditationSession.playAlarmSound.mockImplementationOnce(() => false);
      const throwingSeekTo = mock(async () => {
        throw new Error("Seek error");
      });
      const player = { play: mockPlay, seekTo: throwingSeekTo };

      const strategy = new AndroidGongPlaybackStrategy();
      await strategy.playGong(1, player, 0.8);

      expect(mockPlay).toHaveBeenCalledTimes(1);
      expect(throwingSeekTo).toHaveBeenCalledWith(0);
    });
  });

  describe("IosGongPlaybackStrategy", () => {
    it("preloads as a no-op", async () => {
      const strategy = new IosGongPlaybackStrategy();
      await strategy.preload(1);
    });

    it("plays using fallback expo-audio player", async () => {
      const strategy = new IosGongPlaybackStrategy();
      const player = createMockPlayer();

      await strategy.playGong(1, player, 0.8);

      expect(mockSeekTo).toHaveBeenCalledWith(0);
      expect(mockPlay).toHaveBeenCalledTimes(1);
      expect(mockMeditationSession.playAlarmSound).not.toHaveBeenCalled();
    });

    it("handles null fallback player safely", async () => {
      const strategy = new IosGongPlaybackStrategy();
      await strategy.playGong(1, null, 0.8);
    });

    it("catches seekTo error safely on iOS", async () => {
      const throwingSeekTo = mock(async () => {
        throw new Error("iOS Seek error");
      });
      const player = { play: mockPlay, seekTo: throwingSeekTo };

      const strategy = new IosGongPlaybackStrategy();
      await strategy.playGong(1, player, 0.8);

      expect(mockPlay).toHaveBeenCalledTimes(1);
    });
  });

  describe("WebGongPlaybackStrategy", () => {
    it("preloads as a no-op", async () => {
      const strategy = new WebGongPlaybackStrategy();
      await strategy.preload(1);
    });

    it("plays using fallback player", async () => {
      const strategy = new WebGongPlaybackStrategy();
      const player = createMockPlayer();

      await strategy.playGong(1, player, 0.8);

      expect(mockSeekTo).toHaveBeenCalledWith(0);
      expect(mockPlay).toHaveBeenCalledTimes(1);
    });

    it("handles null fallback player safely", async () => {
      const strategy = new WebGongPlaybackStrategy();
      await strategy.playGong(1, null, 0.8);
    });
  });

  describe("LazyGongPlaybackService (Delegation)", () => {
    it("delegates to platform strategy according to Platform.OS", async () => {
      const originalOS = Platform.OS;

      try {
        Platform.OS = "android";
        await GongPlaybackService.preload(1);

        const player = createMockPlayer();
        await GongPlaybackService.playGong(1, player, 1.0);
        expect(mockMeditationSession.playAlarmSound).toHaveBeenCalled();
      } finally {
        Platform.OS = originalOS;
      }
    });
  });
});
