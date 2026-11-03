import { describe, expect, it } from "bun:test";
import {
  buildMeditationParams,
  meditationViewKey,
  parseMeditationParams,
} from "../meditation-view-params";

/**
 * The reading shown during a session travels in the address so "leé esto" is a
 * link. The identity is the reading's id: the screen selects from the unread-first
 * list, so an offset would point at a different text as soon as something is read.
 */
describe("parseMeditationParams", () => {
  it("keeps the screen as it is when the address names no reading", () => {
    expect(parseMeditationParams({}, { readingId: "r1" })).toEqual({
      readingId: "r1",
    });
  });

  it("reads the named reading", () => {
    expect(parseMeditationParams({ lectura: "r2" }, {})).toEqual({
      readingId: "r2",
    });
  });

  it("reads an empty value as no preference instead of an empty id", () => {
    expect(parseMeditationParams({ lectura: "" }, { readingId: "r1" })).toEqual(
      {
        readingId: undefined,
      },
    );
  });

  it("takes the first value when the parameter arrives repeated", () => {
    expect(parseMeditationParams({ lectura: ["r1", "r2"] }, {}).readingId).toBe(
      "r1",
    );
  });
});

describe("buildMeditationParams", () => {
  it("writes nothing when there is no reading", () => {
    expect(buildMeditationParams({})).toEqual({ lectura: undefined });
  });

  it("writes the reading being shown", () => {
    expect(buildMeditationParams({ readingId: "r1" })).toEqual({
      lectura: "r1",
    });
  });

  it("round-trips through the address", () => {
    const state = { readingId: "r1" };
    const url = new URLSearchParams(
      Object.entries(buildMeditationParams(state)).filter(
        ([, value]) => value !== undefined,
      ) as [string, string][],
    );

    expect(parseMeditationParams(Object.fromEntries(url), {})).toEqual(state);
  });
});

describe("meditationViewKey", () => {
  it("distinguishes one reading from another and from none", () => {
    expect(meditationViewKey({ readingId: "r1" })).not.toBe(
      meditationViewKey({ readingId: "r2" }),
    );
    expect(meditationViewKey({ readingId: "r1" })).not.toBe(
      meditationViewKey({}),
    );
  });

  it("treats an empty id as no reading", () => {
    expect(meditationViewKey({ readingId: "" })).toBe(meditationViewKey({}));
  });
});
