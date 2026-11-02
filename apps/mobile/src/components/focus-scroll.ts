/**
 * How far a scroll container has to move for the focused input to clear the
 * software keyboard, or `null` when it is already visible.
 *
 * The two platforms measure the input differently, and mixing them is the defect
 * this exists to prevent: `measureLayout` returns **content** coordinates on
 * native but **visible-port** coordinates on the web, because react-native-web's
 * `getRect` subtracts every scrollable ancestor's `scrollTop`
 * (`node_modules/react-native-web/dist/exports/UIManager/index.js:15-45`).
 * Subtracting `scrollY` again on the web makes a field that is already behind the
 * keyboard look visible, so nothing scrolls.
 */
export interface FocusedInputScrollInput {
  /** Offset of the input: content coordinates on native, visible-port coordinates on the web. */
  top: number;
  height: number;
  scrollY: number;
  viewHeight: number;
  /** Space the software keyboard covers at the bottom of the window. */
  keyboardInset: number;
  /** Space the system navigation takes on top of the keyboard (Android only). */
  bottomInset: number;
  /** `true` when `top` came from a web `measureLayout`, i.e. is not content-relative. */
  viewportRelative: boolean;
  /** Gap to keep between the input and the top of the viewport. */
  topSpacing: number;
  /** Gap to keep between the input and the keyboard. */
  bottomSpacing: number;
}

export function resolveFocusedInputScroll({
  top,
  height,
  scrollY,
  viewHeight,
  keyboardInset,
  bottomInset,
  viewportRelative,
  topSpacing,
  bottomSpacing,
}: FocusedInputScrollInput): number | null {
  const visibleHeight = Math.max(0, viewHeight - (keyboardInset + bottomInset));
  // The gap is a preference, never a target the viewport cannot afford: when the
  // keyboard leaves less room than the gap itself, the field aligns with the top
  // of the visible band instead of demanding negative space.
  const targetBottom = Math.max(0, visibleHeight - bottomSpacing);
  const inputBottom = top + height;

  // Visible-port coordinates are already relative to what the user sees, so the
  // movement is a delta from the current scroll instead of an absolute offset.
  const coveredBy = viewportRelative
    ? inputBottom - targetBottom
    : inputBottom - scrollY - targetBottom;
  if (coveredBy > 0) {
    const current = viewportRelative ? scrollY : 0;
    return Math.max(0, Math.round(current + coveredBy));
  }

  const distanceAbove = viewportRelative ? top : top - scrollY;
  if (distanceAbove < topSpacing) {
    const current = viewportRelative ? scrollY : 0;
    return Math.max(0, Math.round(current - (topSpacing - distanceAbove)));
  }

  return null;
}
