import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { Divider } from "../divider";

describe("Divider component", () => {
  it("renders with horizontal orientation by default", () => {
    const html = renderToString(<Divider testID="divider" />);
    expect(html).toContain('data-testid="divider"');
  });

  it("renders with vertical orientation", () => {
    const html = renderToString(
      <Divider orientation="vertical" testID="v-divider" />,
    );
    expect(html).toContain('data-testid="v-divider"');
  });

  it("renders with token-based inset spacing", () => {
    const html = renderToString(<Divider inset="md" testID="inset-divider" />);
    expect(html).toContain('data-testid="inset-divider"');
  });

  it("allows custom color override", () => {
    const html = renderToString(
      <Divider color="#FF0000" testID="colored-divider" />,
    );
    expect(html).toContain('data-testid="colored-divider"');
  });
});
