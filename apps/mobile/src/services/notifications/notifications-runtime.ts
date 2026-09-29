import { isRunningInExpoGo } from "expo";
import { Platform } from "react-native";
import type * as ExpoNotifications from "expo-notifications";

/**
 * In Expo SDK 53+, expo-notifications on Android was removed from Expo Go.
 * Importing expo-notifications on Android inside Expo Go triggers a fatal runtime error.
 * This runtime helper loads the module safely and returns null in Expo Go on Android.
 */
export const isNotificationSupported = !(
  Platform.OS === "android" && isRunningInExpoGo()
);

let cachedModule: typeof ExpoNotifications | null = null;

export function getNotifications(): typeof ExpoNotifications | null {
  if (!isNotificationSupported) {
    return null;
  }
  if (!cachedModule) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      cachedModule = require("expo-notifications");
    } catch (error) {
      console.warn("Failed to load expo-notifications:", error);
      return null;
    }
  }
  return cachedModule;
}
