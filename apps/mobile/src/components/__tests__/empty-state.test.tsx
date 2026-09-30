import { describe, expect, it } from "bun:test";
import React from "react";
import { Text } from "react-native";
import { renderToString } from "react-dom/server";
import { EmptyState } from "../empty-state";

describe("EmptyState component", () => {
  it("renders with title, description, and icon props", () => {
    const html = renderToString(
      <EmptyState
        icon="sf:tray"
        title="No Items"
        description="Your list is empty."
      />,
    );
    expect(html).toContain("No Items");
    expect(html).toContain("Your list is empty.");
  });

  it("renders EmptyState.Card with compound subcomponents", () => {
    const html = renderToString(
      <EmptyState.Card>
        <EmptyState.Icon name="sf:book.closed.fill" />
        <EmptyState.Title>Empty Readings</EmptyState.Title>
        <EmptyState.Description>No readings found.</EmptyState.Description>
        <EmptyState.Action>
          <Text>Action Button</Text>
        </EmptyState.Action>
      </EmptyState.Card>,
    );
    expect(html).toContain("Empty Readings");
    expect(html).toContain("No readings found.");
    expect(html).toContain("Action Button");
  });

  it("renders action node from prop", () => {
    const html = renderToString(
      <EmptyState
        title="Empty"
        description="Nothing here"
        action={<Text>Retry</Text>}
      />,
    );
    expect(html).toContain("Retry");
  });
});
