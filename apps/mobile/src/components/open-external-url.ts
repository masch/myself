import { Alert, Linking } from "react-native";

/** Receives the URL that could not be opened, so the user can be told about it. */
export type ExternalUrlFailureNotifier = (url: string) => void;

/**
 * Default user-visible failure notice. It uses a native alert, which
 * `react-native-web` maps to a no-op, so web stays non-intrusive while native
 * platforms tell the user the link could not be opened.
 */
export function notifyExternalUrlFailure(url: string): void {
  Alert.alert(
    "No se pudo abrir el enlace",
    `Revisá el enlace e intentá de nuevo:\n${url}`,
  );
}

/**
 * Opens an external URL and resolves to `true` when the platform accepts it or
 * `false` when it fails, so callers never receive an unhandled rejection.
 *
 * Opening a link is a non-critical side effect: a failure is reported to the
 * console, surfaced to the user through `notifyFailure`, and swallowed, keeping
 * a bad link from crashing or blanking a screen.
 */
export async function openExternalUrl(
  url: string,
  notifyFailure: ExternalUrlFailureNotifier = notifyExternalUrlFailure,
): Promise<boolean> {
  try {
    await Linking.openURL(url);
    return true;
  } catch (error) {
    console.warn("[openExternalUrl] Failed to open URL:", url, error);
    notifyFailure(url);
    return false;
  }
}
