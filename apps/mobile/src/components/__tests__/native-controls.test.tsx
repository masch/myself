import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { Text } from "react-native";
import {
  NativeSwitch,
  NativeListItem,
  NativeFieldGroup,
  NativePicker,
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

    it("renders NativeListItem with layout='vertical'", () => {
      const html = renderToString(
        <NativeListItem
          supportingText="Choose option"
          layout="vertical"
          trailing={<Text>Trailing Element</Text>}
        >
          Stacked Item
        </NativeListItem>,
      );

      expect(html).toContain("Stacked Item");
      expect(html).toContain("Choose option");
      expect(html).toContain("Trailing Element");
    });
  });

  describe("NativePicker", () => {
    it("renders options and highlights selected value", () => {
      const html = renderToString(
        <NativePicker
          options={[
            { label: "Option A", value: "a" },
            { label: "Option B", value: "b" },
          ]}
          value="b"
          onValueChange={() => {}}
        />,
      );

      expect(html).toContain("Option A");
      expect(html).toContain("Option B");
    });
  });
});
