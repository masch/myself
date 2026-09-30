import { describe, expect, it } from "bun:test";
import React from "react";
import { Text, View } from "react-native";
import { renderToString } from "react-dom/server";
import { FormRow } from "../form-row";

describe("FormRow compound component", () => {
  it("renders FormRow container with children", () => {
    const html = renderToString(
      <FormRow testID="form-row">
        <Text>Row Content</Text>
      </FormRow>,
    );
    expect(html).toContain('data-testid="form-row"');
    expect(html).toContain("Row Content");
  });

  it("renders FormRow.Leading slot", () => {
    const html = renderToString(
      <FormRow>
        <FormRow.Leading testID="row-leading">
          <View testID="icon-stub" />
        </FormRow.Leading>
      </FormRow>,
    );
    expect(html).toContain('data-testid="row-leading"');
    expect(html).toContain('data-testid="icon-stub"');
  });

  it("renders FormRow.Input with placeholder and value", () => {
    const html = renderToString(
      <FormRow>
        <FormRow.Input
          testID="row-input"
          placeholder="Enter title"
          value="Test Title"
        />
      </FormRow>,
    );
    expect(html).toContain('data-testid="row-input"');
    expect(html).toContain("Enter title");
    expect(html).toContain("Test Title");
  });

  it("renders FormRow.Trailing slot", () => {
    const html = renderToString(
      <FormRow>
        <FormRow.Trailing testID="row-trailing">
          <Text>Clear</Text>
        </FormRow.Trailing>
      </FormRow>,
    );
    expect(html).toContain('data-testid="row-trailing"');
    expect(html).toContain("Clear");
  });

  it("renders full compound structure correctly", () => {
    const html = renderToString(
      <FormRow testID="full-row">
        <FormRow.Leading testID="full-leading">
          <View testID="icon" />
        </FormRow.Leading>
        <FormRow.Input
          testID="full-input"
          placeholder="Task title"
          value="Buy coffee"
        />
        <FormRow.Trailing testID="full-trailing">
          <View testID="badge" />
        </FormRow.Trailing>
      </FormRow>,
    );
    expect(html).toContain('data-testid="full-row"');
    expect(html).toContain('data-testid="full-leading"');
    expect(html).toContain('data-testid="full-input"');
    expect(html).toContain('data-testid="full-trailing"');
    expect(html).toContain("Buy coffee");
  });

  it("supports fallback and explicit accessibilityLabel on FormRow.Input", () => {
    const htmlWithFallback = renderToString(
      <FormRow>
        <FormRow.Input placeholder="Search query" />
      </FormRow>,
    );
    expect(htmlWithFallback).toContain('aria-label="Search query"');

    const htmlWithExplicit = renderToString(
      <FormRow>
        <FormRow.Input
          placeholder="Escribe aquí..."
          accessibilityLabel="Título en Castellano"
        />
      </FormRow>,
    );
    expect(htmlWithExplicit).toContain('aria-label="Título en Castellano"');
  });
});
