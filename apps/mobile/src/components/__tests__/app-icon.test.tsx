import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { AppIcon } from "../app-icon";
import { SF_VECTOR_MAP } from "../app-icon.constants";
import { colors } from "@/theme";

describe("AppIcon component", () => {
  it("resolves trash-outline vector name for sf:trash", () => {
    expect(SF_VECTOR_MAP["sf:trash"]).toBe("trash-outline");
    expect(SF_VECTOR_MAP["sf:trash.fill"]).toBe("trash");

    const html = renderToString(
      <AppIcon name="sf:trash" size={18} color={colors.systemRed} />,
    );
    expect(html).toBeDefined();
  });

  it("resolves star vector icons accurately", () => {
    expect(SF_VECTOR_MAP["sf:star"]).toBe("star-outline");
    expect(SF_VECTOR_MAP["sf:star.fill"]).toBe("star");

    const starHtml = renderToString(<AppIcon name="sf:star" />);
    expect(starHtml).toBeDefined();
  });

  it("resolves warning icon for offline alerts", () => {
    expect(SF_VECTOR_MAP["sf:exclamationmark.triangle.fill"]).toBe("warning");

    const html = renderToString(
      <AppIcon name="sf:exclamationmark.triangle.fill" />,
    );
    expect(html).toBeDefined();
  });

  it("falls back gracefully for unknown symbols", () => {
    const html = renderToString(<AppIcon name="sf:unknown.nonexistent" />);
    expect(html).toBeDefined();
  });
});
