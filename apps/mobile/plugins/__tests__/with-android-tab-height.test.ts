import { describe, expect, it } from "bun:test";
import fs from "fs";
import os from "os";
import path from "path";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const withAndroidTabHeight = require("../with-android-tab-height");

describe("withAndroidTabHeight Expo Config Plugin", () => {
  it("registers android dangerous mod on config", () => {
    const config = withAndroidTabHeight({ name: "my-app", slug: "my-app" });
    expect(config.mods).toBeDefined();
    expect(config.mods.android).toBeDefined();
    expect(typeof config.mods.android.dangerous).toBe("function");
  });

  it("creates dimens.xml with default 56dp values when file does not exist", async () => {
    const tempDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "expo-tab-height-test-"),
    );

    try {
      const config = withAndroidTabHeight({ name: "test-app" });
      const modFn = config.mods.android.dangerous;

      await modFn({
        ...config,
        modRequest: { platformProjectRoot: tempDir },
      });

      const dimensPath = path.join(
        tempDir,
        "app/src/main/res/values/dimens.xml",
      );
      expect(fs.existsSync(dimensPath)).toBe(true);

      const content = fs.readFileSync(dimensPath, "utf-8");
      expect(content).toContain(
        '<dimen name="m3_navigation_bar_height">56dp</dimen>',
      );
      expect(content).toContain(
        '<dimen name="design_bottom_navigation_height">56dp</dimen>',
      );
      expect(content).toContain(
        '<dimen name="m3_navigation_item_active_indicator_height">28dp</dimen>',
      );
      expect(content).toContain(
        '<dimen name="m3_navigation_item_padding_top">4dp</dimen>',
      );
      expect(content).toContain(
        '<dimen name="m3_navigation_item_padding_bottom">6dp</dimen>',
      );
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("applies custom height and indicatorHeight options when provided", async () => {
    const tempDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "expo-tab-height-test-"),
    );

    try {
      const config = withAndroidTabHeight(
        { name: "test-app" },
        { height: "48dp", indicatorHeight: "24dp" },
      );
      const modFn = config.mods.android.dangerous;

      await modFn({
        ...config,
        modRequest: { platformProjectRoot: tempDir },
      });

      const dimensPath = path.join(
        tempDir,
        "app/src/main/res/values/dimens.xml",
      );
      const content = fs.readFileSync(dimensPath, "utf-8");
      expect(content).toContain(
        '<dimen name="m3_navigation_bar_height">48dp</dimen>',
      );
      expect(content).toContain(
        '<dimen name="design_bottom_navigation_height">48dp</dimen>',
      );
      expect(content).toContain(
        '<dimen name="m3_navigation_item_active_indicator_height">24dp</dimen>',
      );
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("replaces existing dimens entries in existing dimens.xml without altering other resources", async () => {
    const tempDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "expo-tab-height-test-"),
    );

    try {
      const resDir = path.join(tempDir, "app/src/main/res/values");
      fs.mkdirSync(resDir, { recursive: true });
      const dimensPath = path.join(resDir, "dimens.xml");

      const initialContent = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <dimen name="existing_custom_dimen">16dp</dimen>
    <dimen name="m3_navigation_bar_height">80dp</dimen>
</resources>`;
      fs.writeFileSync(dimensPath, initialContent, "utf-8");

      const config = withAndroidTabHeight(
        { name: "test-app" },
        { height: "56dp" },
      );
      const modFn = config.mods.android.dangerous;

      await modFn({
        ...config,
        modRequest: { platformProjectRoot: tempDir },
      });

      const updatedContent = fs.readFileSync(dimensPath, "utf-8");
      expect(updatedContent).toContain(
        '<dimen name="existing_custom_dimen">16dp</dimen>',
      );
      expect(updatedContent).toContain(
        '<dimen name="m3_navigation_bar_height">56dp</dimen>',
      );
      // Ensure the old 80dp entry was removed
      expect(updatedContent).not.toContain(
        '<dimen name="m3_navigation_bar_height">80dp</dimen>',
      );
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
