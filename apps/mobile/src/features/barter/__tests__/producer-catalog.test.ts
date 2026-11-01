import { describe, expect, it } from "bun:test";
import { PRODUCTION_TYPES, producerSchema } from "@myself/shared";
import {
  PRIMAVERA_2026_CATALOG,
  PRIMAVERA_2026_PRODUCERS,
} from "../producer-catalog";
import { POC_DEFAULT_PHONE } from "../whatsapp-utils";
import {
  PRODUCER_IDS,
  SEED_PRODUCERS,
  resolveProducerId,
} from "../barter-store";

/**
 * The catalog is data transcribed from a printed document, so these pins answer
 * one question: does the transcription still match the printed catalog?
 */

const PRINTED_PRODUCERS = 158;

/** Continental Argentina plus the Andean and Patagonian extremes. */
const ARGENTINA_BOUNDS = {
  minLatitude: -55,
  maxLatitude: -21,
  minLongitude: -74,
  maxLongitude: -53,
};

describe("Primavera 2026 catalog transcription", () => {
  it("carries every printed producer, numbered 1 to 158", () => {
    expect(PRIMAVERA_2026_CATALOG).toHaveLength(PRINTED_PRODUCERS);

    const numbers = PRIMAVERA_2026_CATALOG.map((entry) => entry.number).sort(
      (a, b) => a - b,
    );

    expect(numbers).toEqual(
      Array.from({ length: PRINTED_PRODUCERS }, (_, index) => index + 1),
    );
  });

  it("gives every producer a unique id and a unique display name", () => {
    const ids = PRIMAVERA_2026_CATALOG.map((entry) => entry.id);
    const names = PRIMAVERA_2026_CATALOG.map((entry) => entry.name);

    expect(new Set(ids).size).toBe(PRINTED_PRODUCERS);
    expect(new Set(names).size).toBe(PRINTED_PRODUCERS);
  });

  it("keeps the two producers the app already handed out on their own id", () => {
    const byNumber = (number: number) =>
      PRIMAVERA_2026_CATALOG.find((entry) => entry.number === number)?.id;

    expect(byNumber(1)).toBe(PRODUCER_IDS.QUESO);
    expect(byNumber(102)).toBe(PRODUCER_IDS.VERMUT);
  });

  it("produces a valid Producer for every printed row", () => {
    for (const producer of PRIMAVERA_2026_PRODUCERS) {
      const parsed = producerSchema.safeParse(producer);

      expect(parsed.success).toBe(true);
      expect(producer.address.length).toBeGreaterThan(0);
    }
  });

  it("places every producer inside Argentina instead of a placeholder zero", () => {
    for (const producer of PRIMAVERA_2026_PRODUCERS) {
      expect(producer.latitude).toBeGreaterThanOrEqual(
        ARGENTINA_BOUNDS.minLatitude,
      );
      expect(producer.latitude).toBeLessThanOrEqual(
        ARGENTINA_BOUNDS.maxLatitude,
      );
      expect(producer.longitude).toBeGreaterThanOrEqual(
        ARGENTINA_BOUNDS.minLongitude,
      );
      expect(producer.longitude).toBeLessThanOrEqual(
        ARGENTINA_BOUNDS.maxLongitude,
      );
    }
  });

  it("falls back to the documented default number and keeps the printed one", () => {
    const printedNumber = PRIMAVERA_2026_CATALOG.find(
      (entry) => entry.number === 123,
    );

    expect(printedNumber?.phone).toBe("+543516480335");

    for (const entry of PRIMAVERA_2026_CATALOG) {
      if (entry.phone) {
        continue;
      }

      const producer = PRIMAVERA_2026_PRODUCERS.find(
        (candidate) => candidate.id === entry.id,
      );

      expect(producer?.phone).toBe(POC_DEFAULT_PHONE);
    }
  });

  it("maps the printed claims without flattening them and never claims conventional", () => {
    const counts = PRIMAVERA_2026_PRODUCERS.reduce<Record<string, number>>(
      (total, producer) => ({
        ...total,
        [producer.productionType]: (total[producer.productionType] ?? 0) + 1,
      }),
      {},
    );

    // Four headers print "Vegano" (#10, #67, #108, #146) and four print a
    // biodynamic claim (#3, #26, #43, #61); the rest is organic or agroecological.
    expect(counts.VEGAN).toBe(4);
    expect(counts.BIODYNAMIC).toBe(4);
    expect(counts.ORGANIC).toBe(10);
    expect(counts.AGROECOLOGICAL).toBe(140);
    expect(counts.CONVENTIONAL).toBeUndefined();

    const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
    expect(total).toBe(PRINTED_PRODUCERS);
  });

  it("only uses production types the shared contract knows", () => {
    for (const producer of PRIMAVERA_2026_PRODUCERS) {
      expect(PRODUCTION_TYPES).toContain(producer.productionType);
    }
  });
});

describe("Catalog seeding", () => {
  it("seeds exactly the catalog, with no producer outside it", () => {
    const seededIds = SEED_PRODUCERS.map((producer) => producer.id);

    for (const producer of PRIMAVERA_2026_PRODUCERS) {
      expect(seededIds).toContain(producer.id);
    }

    // Colmenas del Sol shipped before the catalog and is not printed in it, so
    // it is gone along with its package: the app shows the network that exists.
    expect(seededIds).not.toContain("colmenas-del-sol");
    expect(seededIds).toHaveLength(PRINTED_PRODUCERS);
  });

  it("resolves the new producers by id and by display name", () => {
    expect(resolveProducerId(SEED_PRODUCERS, "granja-nova")).toBe(
      "granja-nova",
    );
    expect(resolveProducerId(SEED_PRODUCERS, "Granja Nova")).toBe(
      "granja-nova",
    );
    // The two legacy links keep working: they are the values already handed out.
    expect(resolveProducerId(SEED_PRODUCERS, "sabado")).toBe(
      PRODUCER_IDS.VERMUT,
    );
    expect(resolveProducerId(SEED_PRODUCERS, "prod-queso")).toBe(
      PRODUCER_IDS.QUESO,
    );
  });
});
