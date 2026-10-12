import React from "react";
import { View, StyleSheet } from "react-native";
import { colors, radius } from "@/theme";
import { ThemedText } from "./themed-text";
import {
  extractYouTubeVideoId,
  type YouTubePlayerProps,
} from "./youtube-player.types";

export { extractYouTubeVideoId };
export type { YouTubePlayerProps };

export function YouTubePlayer({
  url,
  title = "Video de la reflexión",
  accessibilityLabel = "Reproductor de video de YouTube",
  style,
  testID = "youtube-player",
}: YouTubePlayerProps) {
  const videoId = extractYouTubeVideoId(url);

  if (!videoId) {
    return (
      <View
        testID={testID}
        style={[styles.container, styles.fallbackContainer, style]}
        accessibilityLabel={accessibilityLabel}
      >
        <ThemedText variant="caption1" color={colors.secondaryLabel}>
          Enlace de video no válido
        </ThemedText>
      </View>
    );
  }

  return (
    <View
      testID={testID}
      style={[styles.container, style]}
      accessibilityRole="none"
      accessibilityLabel={accessibilityLabel}
    >
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${videoId}?playsinline=1&modestbranding=1&rel=0`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        style={{
          width: "100%",
          height: "100%",
          border: 0,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.black,
  },
  fallbackContainer: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.systemGray15,
  },
});
