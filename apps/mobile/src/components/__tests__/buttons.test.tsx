import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  AppButton,
  ChipButton,
  IconButton,
  HeaderButton,
  StepperButton,
} from "../index";

describe("Button Primitives with Design System Tokens", () => {
  it("renders AppButton with title and subtitle", () => {
    const html = renderToString(
      <AppButton title="Primary Action" subtitle="Optional helper text" />,
    );
    expect(html).toContain("Primary Action");
    expect(html).toContain("Optional helper text");
  });

  it("renders ChipButton with title", () => {
    const html = renderToString(<ChipButton title="Active Filter" />);
    expect(html).toContain("Active Filter");
  });

  it("renders IconButton with accessibility label", () => {
    const html = renderToString(
      <IconButton icon="checkmark" accessibilityLabel="Confirm action" />,
    );
    expect(html).toBeDefined();
  });

  it("renders HeaderButton with title and variant", () => {
    const html = renderToString(
      <HeaderButton title="Done" variant="primary" />,
    );
    expect(html).toContain("Done");
  });

  it("renders StepperButton in up and down directions", () => {
    const htmlUp = renderToString(
      <StepperButton direction="up" onPress={() => {}} />,
    );
    const htmlDown = renderToString(
      <StepperButton direction="down" onPress={() => {}} />,
    );
    expect(htmlUp).toContain("▲");
    expect(htmlDown).toContain("▼");
  });
});
