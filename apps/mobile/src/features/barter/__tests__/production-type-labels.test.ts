import { describe, expect, it } from "bun:test";
import { PRODUCTION_TYPES } from "@myself/shared";
import {
  PRODUCTION_TYPE_LABELS,
  productionTypeLabel,
} from "../production-type-labels";

/**
 * One owner for the words a producer reads next to the type the app stores.
 * Four badges used to render the raw enum ("AGROECOLOGICAL") while the gondola
 * filter said "Agroecológico", which is two sources of truth for one label.
 */
describe("Production type labels", () => {
  it("labels every production type the contract knows", () => {
    for (const type of PRODUCTION_TYPES) {
      expect(productionTypeLabel(type).length).toBeGreaterThan(0);
    }
  });

  it("never shows a producer the raw enum value", () => {
    for (const type of PRODUCTION_TYPES) {
      expect(productionTypeLabel(type)).not.toBe(type);
    }
  });

  it("gives every type its own label", () => {
    const labels = PRODUCTION_TYPES.map(productionTypeLabel);

    expect(new Set(labels).size).toBe(labels.length);
    expect(Object.keys(PRODUCTION_TYPE_LABELS)).toHaveLength(
      PRODUCTION_TYPES.length,
    );
  });
});
