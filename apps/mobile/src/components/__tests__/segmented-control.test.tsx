import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { SegmentedControl } from "../segmented-control";

describe("SegmentedControl component", () => {
  const items = [
    { value: "daily", label: "Cola Diaria" },
    { value: "cohorts", label: "Programas (Cohorts)" },
  ];

  it("renders all segments with labels", () => {
    const html = renderToString(
      <SegmentedControl
        values={items}
        selectedValue="daily"
        onValueChange={() => {}}
      />,
    );
    expect(html).toContain("Cola Diaria");
    expect(html).toContain("Programas (Cohorts)");
  });

  it("marks active segment with selected accessibility state", () => {
    const html = renderToString(
      <SegmentedControl
        values={items}
        selectedValue="cohorts"
        onValueChange={() => {}}
      />,
    );
    expect(html).toContain('aria-selected="true"');
  });

  it("renders with custom badges if provided", () => {
    const itemsWithBadge = [
      { value: "daily", label: "Cola Diaria", badge: 3 },
      { value: "cohorts", label: "Programas" },
    ];
    const html = renderToString(
      <SegmentedControl
        values={itemsWithBadge}
        selectedValue="daily"
        onValueChange={() => {}}
      />,
    );
    expect(html).toContain("3");
  });
});
