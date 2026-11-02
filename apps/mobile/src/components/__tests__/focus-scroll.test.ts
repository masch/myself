import { describe, expect, it } from "bun:test";
import { resolveFocusedInputScroll } from "../focus-scroll";

/**
 * Where a scroll container has to move so the focused input clears the keyboard.
 *
 * The two platforms measure the input differently, and mixing them is the defect
 * this pins: `measureLayout` returns content coordinates on native but
 * visible-port coordinates on the web, because react-native-web's `getRect`
 * subtracts every scrollable ancestor's `scrollTop`
 * (`node_modules/react-native-web/dist/exports/UIManager/index.js:15-45`).
 * Subtracting `scrollY` again on the web makes a field that is already behind the
 * keyboard look visible, so nothing scrolls.
 */
const TOP_SPACING = 16;
const BOTTOM_SPACING = 24;

describe("resolveFocusedInputScroll", () => {
  it("leaves an input that is already visible alone", () => {
    expect(
      resolveFocusedInputScroll({
        top: 100,
        height: 44,
        scrollY: 0,
        viewHeight: 740,
        keyboardInset: 0,
        bottomInset: 0,
        viewportRelative: true,
        topSpacing: TOP_SPACING,
        bottomSpacing: BOTTOM_SPACING,
      }),
    ).toBeNull();
  });

  it("scrolls a web input that the keyboard covers by its visible offset", () => {
    // 740 viewport, 340 keyboard → the visible band ends at 400. An input whose
    // visible offset is 380..424 has to move up 424 - (400 - 24) = 48.
    expect(
      resolveFocusedInputScroll({
        top: 380,
        height: 44,
        scrollY: 0,
        viewHeight: 740,
        keyboardInset: 340,
        bottomInset: 0,
        viewportRelative: true,
        topSpacing: TOP_SPACING,
        bottomSpacing: BOTTOM_SPACING,
      }),
    ).toBe(48);
  });

  it("still scrolls on the web after the user scrolled, without subtracting the scroll twice", () => {
    // Same covered input, user already 500px down. The measured offset is
    // relative to the visible port, so the target is the current scroll plus the
    // 48px the field has to move: 548. The old content-coordinate math computed
    // 424 - 24 = 400 and scrolled *backwards*.
    expect(
      resolveFocusedInputScroll({
        top: 380,
        height: 44,
        scrollY: 500,
        viewHeight: 740,
        keyboardInset: 340,
        bottomInset: 0,
        viewportRelative: true,
        topSpacing: TOP_SPACING,
        bottomSpacing: BOTTOM_SPACING,
      }),
    ).toBe(548);
  });

  it("treats native measurements as content coordinates", () => {
    // Native: 800 of content, the field sits at content 900..944, the visible
    // band ends at 800 - 340 - 24 = 436, so the container scrolls to 944 - 436.
    expect(
      resolveFocusedInputScroll({
        top: 900,
        height: 44,
        scrollY: 0,
        viewHeight: 800,
        keyboardInset: 340,
        bottomInset: 0,
        viewportRelative: false,
        topSpacing: TOP_SPACING,
        bottomSpacing: BOTTOM_SPACING,
      }),
    ).toBe(508);
  });

  it("adds the system navigation inset on Android", () => {
    expect(
      resolveFocusedInputScroll({
        top: 900,
        height: 44,
        scrollY: 0,
        viewHeight: 800,
        keyboardInset: 340,
        bottomInset: 48,
        viewportRelative: false,
        topSpacing: TOP_SPACING,
        bottomSpacing: BOTTOM_SPACING,
      }),
    ).toBe(556);
  });

  it("scrolls back up when the input sits above the visible band", () => {
    // Web, user scrolled 500 down, the field is 10px above the port's top.
    expect(
      resolveFocusedInputScroll({
        top: -10,
        height: 44,
        scrollY: 500,
        viewHeight: 740,
        keyboardInset: 340,
        bottomInset: 0,
        viewportRelative: true,
        topSpacing: TOP_SPACING,
        bottomSpacing: BOTTOM_SPACING,
      }),
    ).toBe(474);
  });

  it("never returns a negative offset", () => {
    expect(
      resolveFocusedInputScroll({
        top: -10,
        height: 44,
        scrollY: 0,
        viewHeight: 740,
        keyboardInset: 0,
        bottomInset: 0,
        viewportRelative: true,
        topSpacing: TOP_SPACING,
        bottomSpacing: BOTTOM_SPACING,
      }),
    ).toBe(0);
  });

  it("keeps a degenerate visible band from producing a negative target", () => {
    // Keyboard taller than the viewport: the visible band clamps at zero instead
    // of turning the bottom spacing into a negative number.
    expect(
      resolveFocusedInputScroll({
        top: 380,
        height: 44,
        scrollY: 0,
        viewHeight: 400,
        keyboardInset: 380,
        bottomInset: 0,
        viewportRelative: true,
        topSpacing: TOP_SPACING,
        bottomSpacing: BOTTOM_SPACING,
      }),
    ).toBe(424);
  });
});
