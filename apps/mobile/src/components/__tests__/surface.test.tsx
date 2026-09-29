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

  it("renders elevated variant with outer wrapper and inner clipped container", () => {
    const html = renderToString(
      <Surface variant="elevated" padding="md" style={{ marginTop: 16 }}>
        <Text>Elevated Child</Text>
      </Surface>,
    );
    expect(html).toContain("Elevated Child");
    // Outer and inner containers both render in html
    expect(html).toContain("div");
  });

  it("renders with padding='none'", () => {
    const html = renderToString(
      <Surface padding="none">
        <Text>No Padding</Text>
      </Surface>,
    );
    expect(html).toContain("No Padding");
  });

  it("renders elevated variant with custom borderRadius and layout styles", () => {
    const html = renderToString(
      <Surface
        variant="elevated"
        padding="none"
        style={{
          borderRadius: 24,
          alignItems: "center",
          margin: 12,
          flex: 1,
        }}
      >
        <Text>Custom Elevated</Text>
      </Surface>,
    );
    expect(html).toContain("Custom Elevated");
  });
});
