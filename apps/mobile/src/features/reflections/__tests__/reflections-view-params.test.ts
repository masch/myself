import { describe, expect, it } from "bun:test";
import {
  buildReflectionsParams,
  parseReflectionsParams,
  reflectionsViewKey,
  type ReflectionsViewState,
} from "../reflections-view-params";

/**
 * The reflections view travels in the address so "mirá este programa" is a link,
 * and so back closes the preview instead of leaving the section. These pins hold
 * the two directions together.
 */
const CURRENT: ReflectionsViewState = { section: "daily" };

describe("parseReflectionsParams", () => {
  it("keeps the screen as it is when the address says nothing", () => {
    expect(
      parseReflectionsParams({}, { section: "cohorts", cohortId: "c1" }),
    ).toEqual({ section: "cohorts", cohortId: "c1" });
  });

  it("opens the programs section with the previewed cohort", () => {
    expect(
      parseReflectionsParams({ seccion: "cohorts", cohorte: "c1" }, CURRENT),
    ).toEqual({ section: "cohorts", cohortId: "c1" });
  });

  it("reads an unknown section as the daily one instead of throwing", () => {
    expect(parseReflectionsParams({ seccion: "otra" }, CURRENT).section).toBe(
      "daily",
    );
  });

  it("reads an empty cohort as no preview once the address speaks", () => {
    // Closing the sheet removes the parameter; reading it as "whatever was open"
    // is what would bring the sheet back on the next navigation.
    expect(
      parseReflectionsParams(
        { seccion: "cohorts", cohorte: "" },
        { section: "cohorts", cohortId: "c1" },
      ).cohortId,
    ).toBeUndefined();
    expect(
      parseReflectionsParams(
        { seccion: "cohorts" },
        { section: "cohorts", cohortId: "c1" },
      ).cohortId,
    ).toBeUndefined();
  });

  it("takes the first value when a parameter arrives repeated", () => {
    expect(
      parseReflectionsParams({ cohorte: ["c1", "c2"] }, CURRENT).cohortId,
    ).toBe("c1");
  });
});

describe("buildReflectionsParams", () => {
  it("always writes the section so the address can say 'daily, no sheet'", () => {
    expect(buildReflectionsParams(CURRENT)).toEqual({
      seccion: "daily",
      cohorte: undefined,
    });
  });

  it("writes the previewed cohort when there is one", () => {
    expect(
      buildReflectionsParams({ section: "cohorts", cohortId: "c1" }),
    ).toEqual({ seccion: "cohorts", cohorte: "c1" });
  });

  it("round-trips through the address", () => {
    const state: ReflectionsViewState = { section: "cohorts", cohortId: "c1" };
    const url = new URLSearchParams(
      Object.entries(buildReflectionsParams(state)).filter(
        ([, value]) => value !== undefined,
      ) as [string, string][],
    );

    expect(parseReflectionsParams(Object.fromEntries(url), CURRENT)).toEqual(
      state,
    );
  });
});

describe("reflectionsViewKey", () => {
  it("changes when the section or the cohort changes", () => {
    const base = reflectionsViewKey(CURRENT);

    expect(reflectionsViewKey({ section: "cohorts" })).not.toBe(base);
    expect(reflectionsViewKey({ section: "daily", cohortId: "c1" })).not.toBe(
      base,
    );
  });

  it("treats an absent and an empty cohort as the same view", () => {
    expect(reflectionsViewKey({ section: "daily", cohortId: "" })).toBe(
      reflectionsViewKey({ section: "daily" }),
    );
  });
});
