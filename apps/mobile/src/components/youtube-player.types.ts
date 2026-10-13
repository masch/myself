import type { StyleProp, ViewStyle } from "react-native";

export interface YouTubePlayerProps {
  url: string;
  title?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function extractYouTubeVideoId(url: string): string | null {
  if (!url || typeof url !== "string") return null;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const isYouTubeHost =
      host === "youtu.be" ||
      host === "www.youtu.be" ||
      host === "youtube.com" ||
      host === "www.youtube.com" ||
      host === "m.youtube.com" ||
      host === "youtube-nocookie.com" ||
      host === "www.youtube-nocookie.com";

    if (!isYouTubeHost) return null;

    let id: string | null = null;

    if (host.includes("youtu.be")) {
      id = parsed.pathname.slice(1).split("/")[0] || null;
    } else if (parsed.pathname === "/watch") {
      id = parsed.searchParams.get("v");
    } else if (
      parsed.pathname.startsWith("/embed/") ||
      parsed.pathname.startsWith("/v/") ||
      parsed.pathname.startsWith("/shorts/")
    ) {
      const parts = parsed.pathname.split("/").filter(Boolean);
      id = parts[1] || null;
    }

    if (id && /^[\w-]{11}$/.test(id)) {
      return id;
    }

    return null;
  } catch {
    return null;
  }
}
