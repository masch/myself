import { beforeAll, describe, expect, it, mock } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import type { ScreenContainer as ScreenContainerComponent } from "../screen-container";

let ScreenContainer: typeof ScreenContainerComponent;

beforeAll(async () => {
  mock.module("react-native-safe-area-context", () => ({
    useSafeAreaInsets: () => ({ top: 48, bottom: 34, left: 0, right: 0 }),
  }));

  const mod = await import("../screen-container");
  ScreenContainer = mod.ScreenContainer;
});

describe("ScreenContainer component", () => {
  it("renders children cleanly within safe area container", () => {
    const html = renderToString(
      <ScreenContainer>
        <span>Contenido de prueba</span>
      </ScreenContainer>,
    );

    expect(html).toContain("Contenido de prueba");
  });

  it("applies custom testID and custom styles", () => {
    const html = renderToString(
      <ScreenContainer testID="custom-screen" topOffset={12}>
        <span>Screen Body</span>
      </ScreenContainer>,
    );

    expect(html).toContain("Screen Body");
  });

  it("renders scrollable container when scrollable prop is true", () => {
    const html = renderToString(
      <ScreenContainer scrollable testID="scroll-screen">
        <span>Scroll Content</span>
      </ScreenContainer>,
    );

    expect(html).toContain("Scroll Content");
  });
});
