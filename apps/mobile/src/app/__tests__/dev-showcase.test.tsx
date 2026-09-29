import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import DevShowcaseScreen from "../dev-showcase";

describe("DevShowcaseScreen", () => {
  it("renders all design system showcase sections correctly", () => {
    const html = renderToString(<DevShowcaseScreen />);

    expect(html).toContain("Design System");
    expect(html).toContain("1. Color Tokens");
    expect(html).toContain("2. Typography Hierarchy");
    expect(html).toContain("3. Spacing Scale");
    expect(html).toContain("4. Corner Radii &amp; Curvature");
    expect(html).toContain("5. Core Primitives: &lt;Card&gt;");
    expect(html).toContain("6. Accessible Primitives");
    expect(html).toContain("7. Platform-Native Controls");
    expect(html).toContain("8. Atomic Primitives");
  });
});
