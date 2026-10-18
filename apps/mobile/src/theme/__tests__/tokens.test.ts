import { describe, expect, it } from "bun:test";
import {
  colors,
  fontSizes,
  fontWeights,
  layout,
  letterSpacings,
  lineHeights,
  opacities,
  radius,
  shadows,
  spacing,
  typography,
} from "../index";

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

    it("should expose a 2px minimum step alongside the 4-point scale", () => {
      expect(spacing.xxs).toBe(2);
    });

    it("should ensure all non-zero spacing tokens conform to 4-point grid", () => {
      for (const value of Object.values(spacing)) {
        expect(typeof value).toBe("number");
        expect(value % 4 === 0 || value === spacing.xxs).toBe(true);
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

    it("should expose the shared numeric font-weight scale", () => {
      expect(fontWeights.regular).toBe("400");
      expect(fontWeights.medium).toBe("500");
      expect(fontWeights.semibold).toBe("600");
      expect(fontWeights.bold).toBe("700");
      expect(fontWeights.heavy).toBe("800");
    });

    it("should expose the shared font-size scale", () => {
      expect(fontSizes.xs).toBe(11);
      expect(fontSizes.sm).toBe(14);
      expect(fontSizes.md).toBe(16);
      expect(fontSizes.lg).toBe(19);
    });

    it("should expose the shared line-height scale", () => {
      expect(lineHeights.xs).toBe(18);
      expect(lineHeights.sm).toBe(20);
      expect(lineHeights.md).toBe(21);
      expect(lineHeights.lg).toBe(22);
      expect(lineHeights.xl).toBe(25);
    });

    it("should expose the shared letter-spacing scale", () => {
      expect(letterSpacings.caption).toBe(0.5);
      expect(letterSpacings.title).toBe(0.3);
      expect(letterSpacings.body).toBe(0.2);
    });
  });

  describe("opacity tokens", () => {
    it("should expose the pressed-state opacity", () => {
      expect(opacities.pressed).toBe(0.6);
    });

    it("should expose the interaction opacity scale", () => {
      expect(opacities.pressedSoft).toBe(0.7);
      expect(opacities.completed).toBe(0.9);
      expect(opacities.disabled).toBe(0.4);
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

    it("should expose the subdued system green at its exact values", () => {
      expect(colors.systemGreenSubdued).toBe("rgba(52, 199, 89, 0.15)");
      expect(colors.systemGreen8).toBe("rgba(52, 199, 89, 0.08)");
      expect(colors.systemGreen12).toBe("rgba(52, 199, 89, 0.12)");
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
      expect(layout.iconSize.xs).toBe(10);
    });
  });
});
