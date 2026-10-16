import type { z } from "zod";
import type {
  counterOfferHistorySchema,
  counterOfferInputSchema,
  createTradeProposalInputSchema,
  deliveryConfirmationSchema,
  geoLocationSchema,
  producerSchema,
  productionTypeSchema,
  productPackageSchema,
  tradeMatchSchema,
  tradeMatchStatusSchema,
} from "./schemas";

export type ProductionType = z.infer<typeof productionTypeSchema>;
export type GeoLocation = z.infer<typeof geoLocationSchema>;
export type Producer = z.infer<typeof producerSchema>;
export type ProductPackage = z.infer<typeof productPackageSchema>;
export type TradeMatchStatus = z.infer<typeof tradeMatchStatusSchema>;
export type DeliveryConfirmation = z.infer<typeof deliveryConfirmationSchema>;
export type CounterOfferHistory = z.infer<typeof counterOfferHistorySchema>;
export type TradeMatch = z.infer<typeof tradeMatchSchema>;
export type CreateTradeProposalInput = z.infer<
  typeof createTradeProposalInputSchema
>;
export type CounterOfferInput = z.infer<typeof counterOfferInputSchema>;
