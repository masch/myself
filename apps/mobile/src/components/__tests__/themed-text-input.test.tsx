import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { ThemedTextInput } from "../themed-text-input";

describe("ThemedTextInput component", () => {
  it("renders with placeholder and default style attributes", () => {
    const html = renderToString(
      <ThemedTextInput placeholder="Test Placeholder" testID="test-input" />,
    );
    expect(html).toContain("Test Placeholder");
    expect(html).toContain('data-testid="test-input"');
  });

  it("renders with variant typography overrides", () => {
    const html = renderToString(
      <ThemedTextInput variant="callout" placeholder="Callout input" />,
    );
    expect(html).toContain("Callout input");
  });

  it("supports multiline rendering", () => {
    const html = renderToString(
      <ThemedTextInput
        multiline
        numberOfLines={3}
        placeholder="Multiline input"
      />,
    );
    expect(html).toContain("Multiline input");
  });

  it("automatically falls back to placeholder for accessibilityLabel", () => {
    const html = renderToString(
      <ThemedTextInput placeholder="Correo electrónico" />,
    );
    expect(html).toContain('aria-label="Correo electrónico"');
  });

  it("respects explicit accessibilityLabel over placeholder", () => {
    const html = renderToString(
      <ThemedTextInput
        placeholder="Escribe aquí..."
        accessibilityLabel="Nota de reflexión diaria"
      />,
    );
    expect(html).toContain('aria-label="Nota de reflexión diaria"');
  });
});
