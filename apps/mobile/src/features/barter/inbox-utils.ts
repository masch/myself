import type {
  ProductPackage,
  TradeMatch,
  TradeMatchStatus,
} from "@myself/shared";

/**
 * Pure decision helpers for the Barter Inbox UI: whose turn it is, which
 * actions each party can take per FSM status, and which packages are valid
 * counter-offer candidates. Kept side-effect free so they stay unit-testable.
 */

export type TradeRole = "requester" | "target";

/**
 * Resolve which side of the trade the given producer is on, or null when
 * they are not a party to the match.
 */
export function getTradeRole(
  match: Pick<TradeMatch, "requesterId" | "targetProducerId">,
  producerId: string,
): TradeRole | null {
  if (producerId === match.requesterId) return "requester";
  if (producerId === match.targetProducerId) return "target";
  return null;
}

export interface MatchActionAvailability {
  canAccept: boolean;
  canReject: boolean;
  canCounterOffer: boolean;
  /** When set, the other party must respond before the active producer can act. */
  awaitingResponseFrom: TradeRole | null;
}

/**
 * Proposal actions available to a party given the FSM status.
 * Single-round counter-offer rule: once COUNTER_OFFERED, the requester may
 * only accept or reject — never counter the counter.
 */
export function getMatchActionAvailability(
  status: TradeMatchStatus,
  role: TradeRole,
): MatchActionAvailability {
  if (status === "PENDING") {
    return role === "target"
      ? {
          canAccept: true,
          canReject: true,
          canCounterOffer: true,
          awaitingResponseFrom: null,
        }
      : {
          canAccept: false,
          canReject: false,
          canCounterOffer: false,
          awaitingResponseFrom: "target",
        };
  }

  if (status === "COUNTER_OFFERED") {
    return role === "requester"
      ? {
          canAccept: true,
          canReject: true,
          canCounterOffer: false,
          awaitingResponseFrom: null,
        }
      : {
          canAccept: false,
          canReject: false,
          canCounterOffer: false,
          awaitingResponseFrom: "requester",
        };
  }

  return {
    canAccept: false,
    canReject: false,
    canCounterOffer: false,
    awaitingResponseFrom: null,
  };
}

/**
 * Packages the target may propose as a counter-offer: alternatives from the
 * requester's own catalog, excluding the currently offered package and any
 * package without stock.
 */
export function getCounterOfferCandidates(
  allPackages: ProductPackage[],
  match: Pick<TradeMatch, "requesterId" | "offeredPackageId">,
): ProductPackage[] {
  return allPackages.filter(
    (pkg) =>
      pkg.producerId === match.requesterId &&
      pkg.id !== match.offeredPackageId &&
      pkg.stockUnits > 0,
  );
}
