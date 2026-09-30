import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { Spinner } from "../spinner";

describe("Spinner component", () => {
  it("renders with default props and progressbar accessibility role", () => {
    const html = renderToString(<Spinner />);
    expect(html).toContain('role="progressbar"');
  });

  it("renders with label text", () => {
    const html = renderToString(<Spinner label="Loading items..." />);
    expect(html).toContain("Loading items...");
  });

  it("renders Spinner.Centered with compound label", () => {
    const html = renderToString(
      <Spinner.Centered size="lg">
        <Spinner.Label>Please wait...</Spinner.Label>
      </Spinner.Centered>,
    );
    expect(html).toContain('role="progressbar"');
  });
});
