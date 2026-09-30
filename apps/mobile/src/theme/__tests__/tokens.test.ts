import { describe, expect, it } from "bun:test";
import { colors, layout, radius, shadows, spacing, typography } from "../index";

describe("Design System Tokens", () => {
  describe("spacing tokens", () => {
    it("should provide expected 4-point scale steps", () => {
      expect(spacing.xs).toBe(4);
      expect(spacing.sm).toBe(8);
      expect(spacing.compact).toBe(12);
      expect(spacing.md).toBe(16);
      expect(spacing.lg).toBe(24);
      expect(spacing.xl).toBe(32);
      expect(spacing.xxl).toBe(48);
    });

    it("should ensure all non-zero spacing tokens conform to 4-point grid", () => {
      for (const value of Object.values(spacing)) {
        expect(typeof value).toBe("number");
        expect(value % 4).toBe(0);
      }
    });
  });

  describe("typography tokens", () => {
    const requiredVariants = [
      "largeTitle",
      "title1",
      "title2",
      "headline",
      "body",
      "callout",
      "caption1",
      "caption2",
    ] as const;

    it("should contain all Apple HIG / Material 3 aligned variants", () => {
      for (const variant of requiredVariants) {
        expect(typography[variant]).toBeDefined();
      }
    });

    it("should pair fontSize, lineHeight, and fontWeight for every variant", () => {
      for (const variant of requiredVariants) {
        const style = typography[variant];
        expect(typeof style.fontSize).toBe("number");
        expect(typeof style.lineHeight).toBe("number");
        expect(typeof style.fontWeight).toBe("string");
        expect((style.lineHeight as number) >= (style.fontSize as number)).toBe(
          true,
        );
      }
    });
  });

  describe("radius tokens", () => {
    it("should provide standardized corner radii and capsule value", () => {
      expect(radius.sm).toBe(8);
      expect(radius.md).toBe(12);
      expect(radius.lg).toBe(16);
      expect(radius.xl).toBe(24);
      expect(radius.full).toBe(9999);
    });
  });

  describe("shadows tokens", () => {
    it("should define elevation/shadow presets as boxShadow strings", () => {
      expect(typeof shadows.card).toBe("string");
      expect(typeof shadows.raised).toBe("string");
      expect(typeof shadows.overlay).toBe("string");
      expect(shadows.card.length).toBeGreaterThan(0);
      expect(shadows.raised.length).toBeGreaterThan(0);
      expect(shadows.overlay.length).toBeGreaterThan(0);
    });
  });

  describe("colors re-export", () => {
    it("should re-export semantic colors via index", () => {
      expect(colors).toBeDefined();
      expect(colors.systemBackground).toBeDefined();
      expect(colors.label).toBeDefined();
    });
  });

  describe("layout tokens", () => {
    it("should provide standardized screen and card layout metrics", () => {
      expect(layout.screenHorizontalPadding).toBe(12);
      expect(layout.cardPadding).toBe(12);
      expect(layout.cardGap).toBe(16);
      expect(layout.screenTopOffset).toBe(8);
      expect(layout.screenBottomOffset).toBe(16);
      expect(layout.minInteractiveTarget).toBe(44);
      expect(layout.rowHeight).toBe(44);
      expect(layout.rowPaddingVertical).toBe(6);
      expect(layout.iconSize.md).toBe(20);
      expect(layout.iconSize.row).toBe(22);
    });
  });
});
