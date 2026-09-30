import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { Spinner } from "../spinner";

describe("Spinner component", () => {
  it("renders with default props, progressbar accessibility role and fallback label", () => {
    const html = renderToString(<Spinner />);
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-label="Cargando..."');
  });

  it("renders with label text and synchronizes accessibility label", () => {
    const html = renderToString(<Spinner label="Loading items..." />);
    expect(html).toContain("Loading items...");
    expect(html).toContain('aria-label="Loading items..."');
  });

  it("renders with custom accessibilityLabel override", () => {
    const html = renderToString(
      <Spinner accessibilityLabel="Sincronizando datos..." />,
    );
    expect(html).toContain('aria-label="Sincronizando datos..."');
  });

  it("supports explicit animating prop", () => {
    const html = renderToString(<Spinner animating={true} />);
    expect(html).toContain('role="progressbar"');
  });

  it("renders Spinner.Centered with compound label", () => {
    const html = renderToString(
      <Spinner.Centered size="lg">
        <Spinner.Label>Please wait...</Spinner.Label>
      </Spinner.Centered>,
    );
    expect(html).toContain('role="progressbar"');
    expect(html).toContain("Please wait...");
  });
});
