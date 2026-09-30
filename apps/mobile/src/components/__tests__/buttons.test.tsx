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
  it("renders AppButton with title and subtitle and sensible accessibility default", () => {
    const html = renderToString(
      <AppButton title="Primary Action" subtitle="Optional helper text" />,
    );
    expect(html).toContain("Primary Action");
    expect(html).toContain("Optional helper text");
    expect(html).toContain('aria-label="Primary Action, Optional helper text"');
  });

  it("renders AppButton with custom accessibilityLabel override", () => {
    const html = renderToString(
      <AppButton
        title="Save"
        subtitle="Saves data"
        accessibilityLabel="Custom Save Action"
      />,
    );
    expect(html).toContain('aria-label="Custom Save Action"');
  });

  it("renders ChipButton with title", () => {
    const html = renderToString(<ChipButton title="Active Filter" />);
    expect(html).toContain("Active Filter");
  });

  it("renders IconButton with required accessibility label", () => {
    const html = renderToString(
      <IconButton icon="checkmark" accessibilityLabel="Confirm action" />,
    );
    expect(html).toContain('aria-label="Confirm action"');
    expect(html).toContain('role="button"');
  });

  it("renders HeaderButton with title and variant", () => {
    const html = renderToString(
      <HeaderButton title="Done" variant="primary" />,
    );
    expect(html).toContain("Done");
  });

  it("renders StepperButton in up and down directions with accessibility roles and default labels", () => {
    const htmlUp = renderToString(
      <StepperButton direction="up" onPress={() => {}} />,
    );
    const htmlDown = renderToString(
      <StepperButton direction="down" onPress={() => {}} />,
    );
    expect(htmlUp).toContain("▲");
    expect(htmlUp).toContain('role="button"');
    expect(htmlUp).toContain('aria-label="Incrementar valor"');

    expect(htmlDown).toContain("▼");
    expect(htmlDown).toContain('role="button"');
    expect(htmlDown).toContain('aria-label="Decrementar valor"');
  });

  it("renders StepperButton with custom accessibilityLabel override", () => {
    const html = renderToString(
      <StepperButton
        direction="up"
        accessibilityLabel="Aumentar minutos de meditación"
        onPress={() => {}}
      />,
    );
    expect(html).toContain('aria-label="Aumentar minutos de meditación"');
  });
});
