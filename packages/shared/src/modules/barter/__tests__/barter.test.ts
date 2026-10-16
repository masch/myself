import { describe, expect, it } from "bun:test";
import {
  DEFAULT_PAP_VALUE_ARS,
  assertValidTransition,
  calculatePapValue,
  canTransition,
  getAllowedTransitions,
  isTerminalStatus,
  producerSchema,
  productPackageSchema,
  requiresStockDeduction,
  requiresStockRollback,
  tradeMatchSchema,
  type TradeMatchStatus,
} from "../index";

describe("Barter Domain Models & Schemas", () => {
  it("validates a Producer schema correctly", () => {
    const validProducer = {
      id: "prod-1",
      name: "Vermut Sabadao",
      productionType: "AGROECOLOGICAL" as const,
      address: "Chacras de Coria, Mendoza",
      latitude: -32.998,
      longitude: -68.878,
      phone: "+5492615551234",
    };

    const parsed = producerSchema.safeParse(validProducer);
    expect(parsed.success).toBe(true);
  });

  it("rejects invalid Producer data", () => {
    const invalidProducer = {
      id: "prod-1",
      name: "",
      productionType: "UNKNOWN",
    };

    const parsed = producerSchema.safeParse(invalidProducer);
    expect(parsed.success).toBe(false);
  });

  it("validates a ProductPackage with exact 1 PAP equivalence", () => {
    const validPackage = {
      id: "pkg-1",
      producerId: "prod-1",
      title: "Pack 4 Botellas Vermut Rosso 750ml",
      productionType: "AGROECOLOGICAL" as const,
      priceArs: 50000,
      papValue: 1,
      stockUnits: 10,
    };

    const parsed = productPackageSchema.safeParse(validPackage);
    expect(parsed.success).toBe(true);
  });

  it("calculates PAP value accurately from ARS price and config", () => {
    expect(calculatePapValue(50000, DEFAULT_PAP_VALUE_ARS)).toBe(1);
    expect(calculatePapValue(100000, DEFAULT_PAP_VALUE_ARS)).toBe(2);
    expect(calculatePapValue(25000, DEFAULT_PAP_VALUE_ARS)).toBe(0.5);
    expect(calculatePapValue(60000, 60000)).toBe(1);
  });

  it("validates a full TradeMatch entity with snapshot and timestamps", () => {
    const validMatch = {
      id: "match-101",
      requesterId: "prod-1",
      targetProducerId: "prod-2",
      offeredPackageId: "pkg-vermut",
      targetPackageId: "pkg-gouda",
      papSnapshotArs: 50000,
      totalPap: 1,
      status: "PENDING" as const,
      deliveryConfirmation: {
        confirmedByRequester: false,
        confirmedByTarget: false,
      },
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const parsed = tradeMatchSchema.safeParse(validMatch);
    expect(parsed.success).toBe(true);
  });
});

describe("Barter FSM (Finite State Machine)", () => {
  it("allows valid forward lifecycle transitions", () => {
    expect(canTransition("PENDING", "ACCEPTED")).toBe(true);
    expect(canTransition("PENDING", "COUNTER_OFFERED")).toBe(true);
    expect(canTransition("PENDING", "REJECTED")).toBe(true);
    expect(canTransition("PENDING", "EXPIRED")).toBe(true);
    expect(canTransition("PENDING", "CANCELLED_INSUFFICIENT_STOCK")).toBe(true);

    expect(canTransition("COUNTER_OFFERED", "ACCEPTED")).toBe(true);
    expect(canTransition("COUNTER_OFFERED", "REJECTED")).toBe(true);

    expect(canTransition("ACCEPTED", "WAITING_DELIVERY")).toBe(true);
    expect(canTransition("WAITING_DELIVERY", "COMPLETED")).toBe(true);
    expect(canTransition("WAITING_DELIVERY", "CANCELLED_BY_PRODUCER")).toBe(
      true,
    );
  });

  it("disallows invalid or skipping transitions", () => {
    expect(canTransition("PENDING", "COMPLETED")).toBe(false);
    expect(canTransition("COMPLETED", "CANCELLED_BY_PRODUCER")).toBe(false);
    expect(canTransition("REJECTED", "ACCEPTED")).toBe(false);
    expect(canTransition("EXPIRED", "ACCEPTED")).toBe(false);
  });

  it("throws on assertValidTransition when transition is illegal", () => {
    expect(() => assertValidTransition("PENDING", "COMPLETED")).toThrow(
      /Invalid transition from PENDING to COMPLETED/,
    );
  });

  it("correctly flags terminal states", () => {
    const terminalStates: TradeMatchStatus[] = [
      "COMPLETED",
      "REJECTED",
      "EXPIRED",
      "CANCELLED_INSUFFICIENT_STOCK",
      "CANCELLED_BY_PRODUCER",
    ];

    for (const status of terminalStates) {
      expect(isTerminalStatus(status)).toBe(true);
      expect(getAllowedTransitions(status)).toEqual([]);
    }

    expect(isTerminalStatus("PENDING")).toBe(false);
    expect(isTerminalStatus("WAITING_DELIVERY")).toBe(false);
  });

  it("identifies stock deduction trigger transitions", () => {
    expect(requiresStockDeduction("PENDING", "ACCEPTED")).toBe(true);
    expect(requiresStockDeduction("COUNTER_OFFERED", "ACCEPTED")).toBe(true);
    expect(requiresStockDeduction("PENDING", "REJECTED")).toBe(false);
    expect(requiresStockDeduction("ACCEPTED", "WAITING_DELIVERY")).toBe(false);
  });

  it("identifies stock rollback trigger transitions", () => {
    expect(
      requiresStockRollback("WAITING_DELIVERY", "CANCELLED_BY_PRODUCER"),
    ).toBe(true);
    expect(requiresStockRollback("ACCEPTED", "CANCELLED_BY_PRODUCER")).toBe(
      true,
    );
    expect(requiresStockRollback("PENDING", "REJECTED")).toBe(false);
    expect(requiresStockRollback("WAITING_DELIVERY", "COMPLETED")).toBe(false);
  });
});
