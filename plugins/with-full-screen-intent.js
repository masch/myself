const { withAndroidManifest } = require("@expo/config-plugins");

/**
 * Expo Config Plugin to configure Android MainActivity for Full-Screen Intent / Alarm behavior:
 * - android:showWhenLocked="true" -> Allows activity to show when device is locked
 * - android:turnScreenOn="true"   -> Turns device screen on when activity is launched
 * - android:inheritShowWhenLocked="true"
 */
function withFullScreenIntent(config) {
  return withAndroidManifest(config, (configWithManifest) => {
    const mainApplication =
      configWithManifest.modResults.manifest.application?.[0];
    if (!mainApplication) return configWithManifest;

    const mainActivity = mainApplication.activity?.find(
      (activity) =>
        activity.$?.["android:name"] === ".MainActivity" ||
        activity.$?.["android:name"] === "${applicationId}.MainActivity",
    );

    if (mainActivity) {
      mainActivity.$ = {
        ...mainActivity.$,
        "android:showWhenLocked": "true",
        "android:turnScreenOn": "true",
        "android:inheritShowWhenLocked": "true",
      };
    }

    return configWithManifest;
  });
}

module.exports = withFullScreenIntent;
