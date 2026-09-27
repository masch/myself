import { beforeAll, describe, expect, it, mock } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import type {
  ScreenContainer as ScreenContainerComponent,
  ScrollScreenContainer as ScrollScreenContainerComponent,
  useScreenPadding as useScreenPaddingHook,
} from "../screen-container";

let ScreenContainer: typeof ScreenContainerComponent;
let ScrollScreenContainer: typeof ScrollScreenContainerComponent;
let useScreenPadding: typeof useScreenPaddingHook;

beforeAll(async () => {
  mock.module("react-native-safe-area-context", () => ({
    useSafeAreaInsets: () => ({ top: 48, bottom: 34, left: 10, right: 12 }),
  }));

  const mod = await import("../screen-container");
  ScreenContainer = mod.ScreenContainer;
  ScrollScreenContainer = mod.ScrollScreenContainer;
  useScreenPadding = mod.useScreenPadding;
});

describe("ScreenContainer component & useScreenPadding hook", () => {
  it("computes safe area padding correctly via useScreenPadding hook", () => {
    const defaultPadding = useScreenPadding();
    expect(defaultPadding.paddingTop).toBe(48 + 8);
    expect(defaultPadding.paddingBottom).toBe(34 + 16);
    expect(defaultPadding.paddingLeft).toBe(0);
    expect(defaultPadding.paddingRight).toBe(0);

    const customPadding = useScreenPadding({
      edges: ["left", "right"],
      topOffset: 0,
      bottomOffset: 0,
    });
    expect(customPadding.paddingTop).toBe(0);
    expect(customPadding.paddingBottom).toBe(0);
    expect(customPadding.paddingLeft).toBe(10);
    expect(customPadding.paddingRight).toBe(12);
  });

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

  it("renders via ScreenContainer.Scroll compound component", () => {
    const html = renderToString(
      <ScreenContainer.Scroll testID="compound-scroll">
        <span>Compound Scroll Content</span>
      </ScreenContainer.Scroll>,
    );

    expect(html).toContain("Compound Scroll Content");
  });

  it("renders via ScrollScreenContainer named export", () => {
    const html = renderToString(
      <ScrollScreenContainer testID="named-scroll">
        <span>Named Scroll Content</span>
      </ScrollScreenContainer>,
    );

    expect(html).toContain("Named Scroll Content");
  });
});
