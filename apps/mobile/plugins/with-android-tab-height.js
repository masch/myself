const { withDangerousMod, AndroidConfig } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Expo Config Plugin to reduce Android Material 3 NavigationBar height from 80dp to 56dp,
 * reclaiming precious screen real-estate in native Android.
 */
const withAndroidTabHeight = (config, options = {}) => {
  const height = options.height || "56dp";
  const indicatorHeight = options.indicatorHeight || "28dp";

  return withDangerousMod(config, [
    "android",
    async (config) => {
      let dimensPath;
      try {
        const projectRoot =
          config.modRequest?.projectRoot ||
          (config.modRequest?.platformProjectRoot
            ? path.dirname(config.modRequest.platformProjectRoot)
            : process.cwd());

        dimensPath = await AndroidConfig.Paths.getResourceXMLPathAsync(
          projectRoot,
          { name: "dimens" },
        );
      } catch {
        dimensPath = path.join(
          config.modRequest?.platformProjectRoot || process.cwd(),
          "app/src/main/res/values/dimens.xml",
        );
      }

      const resDir = path.dirname(dimensPath);
      fs.mkdirSync(resDir, { recursive: true });

      let content = "";
      if (fs.existsSync(dimensPath)) {
        content = fs.readFileSync(dimensPath, "utf-8");
      }

      const dimensionOverrides = [
        { name: "m3_navigation_bar_height", value: height },
        { name: "m3_bottom_nav_min_height", value: height },
        { name: "design_bottom_navigation_height", value: height },
        {
          name: "m3_navigation_item_active_indicator_height",
          value: indicatorHeight,
        },
        {
          name: "m3_bottom_nav_item_active_indicator_height",
          value: indicatorHeight,
        },
        { name: "m3_navigation_item_padding_top", value: "4dp" },
        { name: "m3_bottom_nav_item_padding_top", value: "4dp" },
        { name: "m3_navigation_item_padding_bottom", value: "6dp" },
        { name: "m3_bottom_nav_item_padding_bottom", value: "6dp" },
      ];

      // Remove existing overrides if present to avoid duplication
      for (const { name } of dimensionOverrides) {
        const regex = new RegExp(`\\s*<dimen name="${name}">.*?</dimen>`, "g");
        content = content.replace(regex, "");
      }

      const dimensEntries = dimensionOverrides.map(
        ({ name, value }) => `<dimen name="${name}">${value}</dimen>`,
      );

      if (!content || !/<resources[^>]*>/i.test(content)) {
        content = `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    ${dimensEntries.join(
          "\n    ",
        )}\n</resources>\n`;
      } else {
        content = content.replace(
          /<\/resources>/i,
          `    ${dimensEntries.join("\n    ")}\n</resources>`,
        );
      }

      fs.writeFileSync(dimensPath, content, "utf-8");
      return config;
    },
  ]);
};

module.exports = withAndroidTabHeight;
