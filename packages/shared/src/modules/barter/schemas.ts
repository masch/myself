import { z } from "zod";

export const DEFAULT_PAP_VALUE_ARS = 50000;

export const PRODUCTION_TYPES = [
  "ORGANIC",
  "AGROECOLOGICAL",
  "BIODYNAMIC",
  "VEGAN",
  "CONVENTIONAL",
] as const;

export const productionTypeSchema = z.enum(PRODUCTION_TYPES);

export const geoLocationSchema = z.object({
  address: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const producerSchema = geoLocationSchema.extend({
  id: z.string().min(1),
  name: z.string().min(1),
  productionType: productionTypeSchema,
  /** Absent when the catalog prints no contact number for the producer. */
  phone: z.string().min(6).optional(),
});

export const productPackageSchema = z.object({
  id: z.string().min(1),
  producerId: z.string().min(1),
  title: z.string().min(1),
  productionType: productionTypeSchema,
  priceArs: z.number().positive(),
  papValue: z.number().int().positive(),
  stockUnits: z.number().int().min(0),
});

export const TRADE_MATCH_STATUSES = [
  "PENDING",
  "COUNTER_OFFERED",
  "ACCEPTED",
  "WAITING_DELIVERY",
  "COMPLETED",
  "REJECTED",
  "EXPIRED",
  "CANCELLED_INSUFFICIENT_STOCK",
  "CANCELLED_BY_PRODUCER",
] as const;

export const tradeMatchStatusSchema = z.enum(TRADE_MATCH_STATUSES);

export const deliveryConfirmationSchema = z.object({
  confirmedByRequester: z.boolean(),
  confirmedByTarget: z.boolean(),
});

export const counterOfferHistorySchema = z.object({
  previousOfferedPackageId: z.string().min(1),
  counterOfferedAt: z.iso.datetime(),
});

export const tradeMatchSchema = z.object({
  id: z.string().min(1),
  requesterId: z.string().min(1),
  targetProducerId: z.string().min(1),
  offeredPackageId: z.string().min(1),
  targetPackageId: z.string().min(1),
  papSnapshotArs: z.number().positive(),
  totalPap: z.number().int().positive(),
  status: tradeMatchStatusSchema,
  deliveryConfirmation: deliveryConfirmationSchema,
  counterOfferHistory: counterOfferHistorySchema.optional(),
  expiresAt: z.iso.datetime(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const createTradeProposalInputSchema = z.object({
  requesterId: z.string().min(1),
  targetProducerId: z.string().min(1),
  offeredPackageId: z.string().min(1),
  targetPackageId: z.string().min(1),
  papConfigArs: z.number().positive().default(DEFAULT_PAP_VALUE_ARS),
  ttlHours: z.number().positive().default(48),
});

export const counterOfferInputSchema = z.object({
  matchId: z.string().min(1),
  targetProducerId: z.string().min(1),
  counterOfferedPackageId: z.string().min(1),
});

/**
 * Converts an ARS price into PAP units.
 *
 * The POC trades whole PAP units 1:1, so the single owner of this math refuses
 * a price that is not an exact multiple of the PAP configuration instead of
 * rounding it silently: a rounded value would let an unbalanced trade pass as
 * balanced.
 */
export function calculatePapValue(
  priceArs: number,
  papConfigArs: number,
): number {
  if (papConfigArs <= 0) {
    throw new Error("PAP configuration value must be strictly positive");
  }
  if (priceArs % papConfigArs !== 0) {
    throw new Error(
      `Price ${priceArs} ARS is not an exact multiple of the PAP configuration ${papConfigArs} ARS`,
    );
  }
  return priceArs / papConfigArs;
}
