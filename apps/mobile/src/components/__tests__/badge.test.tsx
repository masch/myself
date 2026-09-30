import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { Badge } from "../badge";

describe("Badge component", () => {
  it("renders with label prop and default styling", () => {
    const html = renderToString(<Badge testID="badge" label="Active" />);
    expect(html).toContain("Active");
    expect(html).toContain('data-testid="badge"');
  });

  it("renders with variant and icon", () => {
    const html = renderToString(
      <Badge variant="success" icon="sf:checkmark" label="Completed" />,
    );
    expect(html).toContain("Completed");
  });

  it("renders compound Badge.Text and Badge.Icon children", () => {
    const html = renderToString(
      <Badge variant="purple" size="lg">
        <Badge.Icon name="sf:sparkles" />
        <Badge.Text>Mindfulness</Badge.Text>
      </Badge>,
    );
    expect(html).toContain("Mindfulness");
  });
});
