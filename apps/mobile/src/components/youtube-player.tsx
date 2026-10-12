import React, { useState } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
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
  const [isLoading, setIsLoading] = useState(true);
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

  const embedHtml = `
<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
    <meta name="referrer" content="strict-origin-when-cross-origin">
    <style>
      body, html {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        background-color: #000;
        overflow: hidden;
      }
      .video-wrapper {
        position: relative;
        width: 100%;
        height: 100%;
      }
      iframe {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border: 0;
      }
    </style>
  </head>
  <body>
    <div class="video-wrapper">
      <iframe
        src="https://www.youtube-nocookie.com/embed/${videoId}?playsinline=1&modestbranding=1&rel=0&origin=https://www.youtube-nocookie.com"
        title="${title}"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
        referrerpolicy="strict-origin-when-cross-origin">
      </iframe>
    </div>
  </body>
</html>
  `;

  return (
    <View
      testID={testID}
      style={[styles.container, style]}
      accessibilityRole="none"
      accessibilityLabel={accessibilityLabel}
    >
      <WebView
        source={{
          html: embedHtml,
          baseUrl: "https://www.youtube-nocookie.com",
        }}
        originWhitelist={["*"]}
        allowsFullscreenVideo
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        onLoadEnd={() => setIsLoading(false)}
        style={styles.webView}
      />
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color={colors.systemBlue} />
        </View>
      )}
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
    position: "relative",
  },
  webView: {
    flex: 1,
    backgroundColor: colors.black,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.scrim,
  },
  fallbackContainer: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.systemGray15,
  },
});
