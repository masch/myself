import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { Text } from "react-native";
import { Accordion, Collapsible } from "../primitives";

describe("Accessible Primitives", () => {
  describe("Collapsible", () => {
    it("renders trigger and open content correctly", () => {
      const html = renderToString(
        <Collapsible open={true}>
          <Collapsible.Trigger>
            <Text>Toggle Settings</Text>
          </Collapsible.Trigger>
          <Collapsible.Content>
            <Text>Expanded Panel</Text>
          </Collapsible.Content>
        </Collapsible>,
      );

      expect(html).toContain("Toggle Settings");
      expect(html).toContain("Expanded Panel");
    });

    it("hides content when closed", () => {
      const html = renderToString(
        <Collapsible open={false}>
          <Collapsible.Trigger>
            <Text>Toggle Settings</Text>
          </Collapsible.Trigger>
          <Collapsible.Content>
            <Text>Expanded Panel</Text>
          </Collapsible.Content>
        </Collapsible>,
      );

      expect(html).toContain("Toggle Settings");
      expect(html).not.toContain("Expanded Panel");
    });
    it("supports asChild on trigger", () => {
      const html = renderToString(
        <Collapsible open={true}>
          <Collapsible.Trigger asChild>
            <Text testID="custom-trigger">Custom Child Trigger</Text>
          </Collapsible.Trigger>
          <Collapsible.Content>
            <Text>Expanded Panel</Text>
          </Collapsible.Content>
        </Collapsible>,
      );

      expect(html).toContain("Custom Child Trigger");
      expect(html).toContain("Expanded Panel");
    });
  });

  describe("Accordion", () => {
    it("renders accordion structure and open item content", () => {
      const html = renderToString(
        <Accordion type="single" value="item-1">
          <Accordion.Item value="item-1">
            <Accordion.Header>
              <Accordion.Trigger>
                <Text>Section 1</Text>
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content>
              <Text>Section 1 Body</Text>
            </Accordion.Content>
          </Accordion.Item>
          <Accordion.Item value="item-2">
            <Accordion.Header>
              <Accordion.Trigger>
                <Text>Section 2</Text>
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content>
              <Text>Section 2 Body</Text>
            </Accordion.Content>
          </Accordion.Item>
        </Accordion>,
      );

      expect(html).toContain("Section 1");
      expect(html).toContain("Section 1 Body");
      expect(html).toContain("Section 2");
      expect(html).not.toContain("Section 2 Body");
    });

    it("supports multiple items open when type is multiple", () => {
      const html = renderToString(
        <Accordion type="multiple" value={["item-1", "item-2"]}>
          <Accordion.Item value="item-1">
            <Accordion.Header>
              <Accordion.Trigger>
                <Text>Header 1</Text>
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content>
              <Text>Content 1</Text>
            </Accordion.Content>
          </Accordion.Item>
          <Accordion.Item value="item-2">
            <Accordion.Header>
              <Accordion.Trigger>
                <Text>Header 2</Text>
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content>
              <Text>Content 2</Text>
            </Accordion.Content>
          </Accordion.Item>
        </Accordion>,
      );

      expect(html).toContain("Content 1");
      expect(html).toContain("Content 2");
    });
  });
});
