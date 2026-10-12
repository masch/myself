import type { StyleProp, ViewStyle } from "react-native";

export interface YouTubePlayerProps {
  url: string;
  title?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const regExp =
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/;
  const match = url.match(regExp);
  return match ? match[1] : null;
}
