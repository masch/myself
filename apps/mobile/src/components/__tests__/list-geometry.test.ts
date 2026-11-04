import { describe, expect, it } from "bun:test";
import { resolveListGeometry } from "../screen-container";

/**
 * Where a list container's padding lands.
 *
 * The gondola pins its search field above the list, so the container has two
 * bands: a fixed one that never scrolls and the scrolling content. The safe-area
 * top belongs to whichever is on screen first, and this rule — expressed as a
 * plain function — is what keeps it from being applied twice, or from leaving the
 * pinned field flush against the status bar.
 */

/** A phone with a notch: 48 points of top safe area, 34 of home indicator. */
const containerPadding = {
  paddingTop: 48 + 8,
  paddingBottom: 34 + 16,
  paddingLeft: 0,
  paddingRight: 0,
};

describe("resolveListGeometry", () => {
  it("keeps the top safe area in the content when nothing is pinned above the list", () => {
    const geometry = resolveListGeometry({
      containerPadding,
      horizontalPadding: 16,
      keyboardInset: 0,
      gap: 0,
      hasFixedHeader: false,
    });

    expect(geometry.content.paddingTop).toBe(56);
    expect(geometry.fixedHeader.paddingTop).toBe(0);
  });

  it("moves the top safe area to the pinned band instead of doubling it", () => {
    const geometry = resolveListGeometry({
      containerPadding,
      horizontalPadding: 16,
      keyboardInset: 0,
      gap: 0,
      hasFixedHeader: true,
    });

    expect(geometry.fixedHeader.paddingTop).toBe(56);
    // The band already cleared the status bar: the content must not repeat it.
    expect(geometry.content.paddingTop).toBe(0);
  });

  it("gives the pinned band the same gutter as the rows under it", () => {
    const geometry = resolveListGeometry({
      containerPadding: {
        ...containerPadding,
        paddingLeft: 10,
        paddingRight: 12,
      },
      horizontalPadding: 16,
      keyboardInset: 0,
      gap: 0,
      hasFixedHeader: true,
    });

    expect(geometry.fixedHeader.paddingLeft).toBe(26);
    expect(geometry.fixedHeader.paddingRight).toBe(28);
    expect(geometry.content.paddingLeft).toBe(26);
    expect(geometry.content.paddingRight).toBe(28);
  });

  it("reserves the safe area, the keyboard and the gap at the bottom, pinned or not", () => {
    for (const hasFixedHeader of [false, true]) {
      const geometry = resolveListGeometry({
        containerPadding,
        horizontalPadding: 16,
        keyboardInset: 300,
        gap: 16,
        hasFixedHeader,
      });

      // The last row has to be able to scroll clear of the keyboard.
      expect(geometry.content.paddingBottom).toBe(50 + 300 + 16);
    }
  });

  it("reserves nothing extra while the keyboard is closed", () => {
    const geometry = resolveListGeometry({
      containerPadding,
      horizontalPadding: 16,
      keyboardInset: 0,
      gap: 0,
      hasFixedHeader: true,
    });

    expect(geometry.content.paddingBottom).toBe(50);
  });
});
