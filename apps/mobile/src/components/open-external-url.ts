import { Linking } from "react-native";

/**
 * Opens an external URL and resolves to `true` when the platform accepts it or
 * `false` when it fails, so callers never receive an unhandled rejection.
 *
 * Opening a link is a non-critical side effect: a failure is reported to the
 * console and swallowed, keeping a bad link from crashing or blanking a screen.
 */
export async function openExternalUrl(url: string): Promise<boolean> {
  try {
    await Linking.openURL(url);
    return true;
  } catch (error) {
    console.warn("[openExternalUrl] Failed to open URL:", url, error);
    return false;
  }
}
