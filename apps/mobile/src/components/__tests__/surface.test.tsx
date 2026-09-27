import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { Text } from "react-native";
import { Surface, Card } from "../surface";

describe("Surface / Card component", () => {
  it("renders children content correctly", () => {
    const html = renderToString(
      <Surface>
        <Text>Card Content</Text>
      </Surface>,
    );
    expect(html).toContain("Card Content");
  });

  it("Card is an alias of Surface", () => {
    expect(Card).toBe(Surface);
  });

  it("renders with elevated variant without throwing", () => {
    const html = renderToString(
      <Surface variant="elevated">
        <Text>Elevated Content</Text>
      </Surface>,
    );
    expect(html).toContain("Elevated Content");
  });

  it("renders with outlined variant without throwing", () => {
    const html = renderToString(
      <Surface variant="outlined">
        <Text>Outlined Content</Text>
      </Surface>,
    );
    expect(html).toContain("Outlined Content");
  });

  it("renders with custom padding prop", () => {
    const html = renderToString(
      <Surface padding="lg">
        <Text>Padded Content</Text>
      </Surface>,
    );
    expect(html).toContain("Padded Content");
  });

  it("merges custom style overrides", () => {
    const html = renderToString(
      <Surface style={{ marginTop: 24 }}>
        <Text>Margin Content</Text>
      </Surface>,
    );
    expect(html).toContain("Margin Content");
  });
});
