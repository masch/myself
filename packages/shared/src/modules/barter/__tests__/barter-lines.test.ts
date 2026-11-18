import { describe, expect, it } from "bun:test";
import {
  MAX_COUNTER_ROUNDS,
  PROPOSAL_TTL_MS,
  tradeLineSchema,
  tradeMatchSchema,
} from "../index";

describe("Multi-PAP trade lines (issue #162)", () => {
  it("exposes the negotiation config constants", () => {
    // Rule 9: the round limit defaults to 50, an app-level constant.
    expect(MAX_COUNTER_ROUNDS).toBe(50);
    // Rule 10: the proposal TTL is configurable; default 48h in ms.
    expect(PROPOSAL_TTL_MS).toBe(48 * 3600 * 1000);
  });

  it("accepts a trade line with units >= 1 of an exact package", () => {
    const parsed = tradeLineSchema.safeParse({
      packageId: "direct-vermut-rosso-750",
      units: 2,
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a trade line with units < 1", () => {
    const parsed = tradeLineSchema.safeParse({
      packageId: "direct-vermut-rosso-750",
      units: 0,
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects a trade line without a package id", () => {
    const parsed = tradeLineSchema.safeParse({ units: 1 });
    expect(parsed.success).toBe(false);
  });

  const baseMatch = {
    id: "match-1",
    requesterId: "sabado",
    targetProducerId: "naturaleza-viva",
    offeredLines: [
      { packageId: "direct-vermut-rosso-750", units: 2 },
      { packageId: "direct-vermut-blanco-750", units: 1 },
    ],
    targetLines: [
      { packageId: "cat-890", units: 2 },
      { packageId: "cat-2", units: 1 },
    ],
    papSnapshotArs: 50000,
    totalPap: 3,
    round: 0,
    status: "PENDING" as const,
    deliveryConfirmation: {
      confirmedByRequester: false,
      confirmedByTarget: false,
    },
    expiresAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it("validates a match with balanced line lists, round and expiresAt", () => {
    const parsed = tradeMatchSchema.safeParse(baseMatch);
    expect(parsed.success).toBe(true);
  });

  it("rejects a match with unbalanced line lists", () => {
    const parsed = tradeMatchSchema.safeParse({
      ...baseMatch,
      offeredLines: [{ packageId: "direct-vermut-rosso-750", units: 3 }],
      targetLines: [{ packageId: "cat-890", units: 2 }],
    });
    expect(parsed.success).toBe(false);
  });
});
