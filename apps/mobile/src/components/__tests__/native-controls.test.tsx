import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { Text } from "react-native";
import {
  NativeSwitch,
  NativeListItem,
  NativeFieldGroup,
} from "../native-controls";

describe("Native Controls", () => {
  describe("NativeSwitch", () => {
    it("renders switch with value true and accessibilityLabel", () => {
      const html = renderToString(
        <NativeSwitch
          value={true}
          onValueChange={() => {}}
          accessibilityLabel="Enable Notifications"
        />,
      );

      expect(html).toBeDefined();
    });
  });

  describe("NativeFieldGroup and NativeListItem", () => {
    it("renders section with title and items", () => {
      const html = renderToString(
        <NativeFieldGroup>
          <NativeFieldGroup.Section title="Account Settings">
            <NativeListItem
              supportingText="user@example.com"
              trailing={<Text>Edit</Text>}
            >
              John Doe
            </NativeListItem>
          </NativeFieldGroup.Section>
        </NativeFieldGroup>,
      );

      expect(html).toContain("ACCOUNT SETTINGS");
      expect(html).toContain("John Doe");

      expect(html).toContain("user@example.com");
      expect(html).toContain("Edit");
    });
  });
});
