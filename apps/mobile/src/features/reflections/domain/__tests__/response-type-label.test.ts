import { describe, expect, it } from "bun:test";
import { RESPONSE_TYPES, type ResponseType } from "@myself/shared";
import {
  RESPONSE_TYPE_LABELS,
  getResponseTypeLabel,
} from "../response-type-label";

describe("getResponseTypeLabel", () => {
  it("labels every known response type", () => {
    expect(getResponseTypeLabel("text")).toBe("Texto libre");
    expect(getResponseTypeLabel("scale_1_10")).toBe("Escala 1-10");
    expect(getResponseTypeLabel("item_list")).toBe("Lista de momentos");
  });

  it("declares a label for every response type and no extra keys", () => {
    expect(new Set(Object.keys(RESPONSE_TYPE_LABELS))).toEqual(
      new Set(RESPONSE_TYPES),
    );
  });

  it("falls back to the free-text label for an unknown response type", () => {
    expect(getResponseTypeLabel("unknown" as ResponseType)).toBe("Texto libre");
  });
});
