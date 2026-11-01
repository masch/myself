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
 * requester's own catalog, excluding the currently offered package, any package
 * without stock, and any package whose PAP value would unbalance the 1:1 trade.
 */
export function getCounterOfferCandidates(
  allPackages: ProductPackage[],
  match: Pick<TradeMatch, "requesterId" | "offeredPackageId" | "totalPap">,
): ProductPackage[] {
  return allPackages.filter(
    (pkg) =>
      pkg.producerId === match.requesterId &&
      pkg.id !== match.offeredPackageId &&
      pkg.stockUnits > 0 &&
      pkg.papValue === match.totalPap,
  );
}

/**
 * Whether `producerId` still owes an answer on this match.
 *
 * Derived from `getMatchActionAvailability` instead of re-listing statuses, so
 * the inbox buttons and the identity switcher can never disagree about whose
 * turn it is: a party owes an answer exactly when the FSM offers it an action.
 */
export function isAwaitingReply(
  match: Pick<TradeMatch, "requesterId" | "targetProducerId" | "status">,
  producerId: string,
): boolean {
  const role = getTradeRole(match, producerId);
  if (!role) return false;

  const availability = getMatchActionAvailability(match.status, role);
  return (
    availability.canAccept ||
    availability.canReject ||
    availability.canCounterOffer
  );
}

/**
 * What a producer still has on its plate, trade by trade.
 *
 * One pass over the matches instead of one filter per question: the selector
 * shows all of it at once, and separate counters over the same list drift apart
 * the moment a status is added.
 */
export interface ProducerTradeSummary {
  /** The FSM offers this producer an action: it has to answer a proposal. */
  awaitingReply: number;
  /** Agreed but not handed over yet: both sides still have to arrange it. */
  toCoordinate: number;
  /** Delivering, and this producer has not confirmed receiving it. */
  toConfirm: number;
  /** Delivered and confirmed by both sides: the trade happened. */
  completed: number;
}

const EMPTY_SUMMARY: ProducerTradeSummary = {
  awaitingReply: 0,
  toCoordinate: 0,
  toConfirm: 0,
  completed: 0,
};

/**
 * Whether this producer has already confirmed receiving the trade, which is
 * what turns "waiting for delivery" into "done" once both sides do it.
 */
function hasConfirmedOwnDelivery(
  match: Pick<TradeMatch, "requesterId" | "deliveryConfirmation">,
  producerId: string,
): boolean {
  return match.requesterId === producerId
    ? match.deliveryConfirmation.confirmedByRequester
    : match.deliveryConfirmation.confirmedByTarget;
}

/**
 * Per-producer counts of what is outstanding and what is done, keyed by
 * producer id. A producer with nothing to report is absent from the map rather
 * than mapped to zeros, so a caller renders badges only when there is something
 * to say.
 *
 * Only `COMPLETED` counts as a trade that happened: `ACCEPTED` and
 * `WAITING_DELIVERY` can still be cancelled or never delivered.
 */
export function summarizeProducerTrades(
  matches: Pick<
    TradeMatch,
    "requesterId" | "targetProducerId" | "status" | "deliveryConfirmation"
  >[],
): Record<string, ProducerTradeSummary> {
  const summaries: Record<string, ProducerTradeSummary> = {};

  const summaryFor = (producerId: string): ProducerTradeSummary =>
    summaries[producerId] ?? { ...EMPTY_SUMMARY };

  for (const match of matches) {
    for (const producerId of [match.requesterId, match.targetProducerId]) {
      const summary = summaryFor(producerId);

      if (isAwaitingReply(match, producerId)) {
        summary.awaitingReply += 1;
      }

      if (match.status === "ACCEPTED") {
        summary.toCoordinate += 1;
      }

      if (
        match.status === "WAITING_DELIVERY" &&
        !hasConfirmedOwnDelivery(match, producerId)
      ) {
        summary.toConfirm += 1;
      }

      if (match.status === "COMPLETED") {
        summary.completed += 1;
      }

      summaries[producerId] = summary;
    }
  }

  // A party that has nothing outstanding and nothing done is not worth a row in
  // the map: keeping it would force every caller to distinguish "no entry" from
  // "zeros", which is the same answer twice.
  for (const producerId of Object.keys(summaries)) {
    const summary = summaries[producerId];
    const total =
      summary.awaitingReply +
      summary.toCoordinate +
      summary.toConfirm +
      summary.completed;

    if (total === 0) {
      delete summaries[producerId];
    }
  }

  return summaries;
}

/**
 * Whether this producer has something to do right now.
 *
 * A finished trade is history, not a task, so `completed` alone does not make a
 * producer actionable — which is the whole point of the selector's filter.
 */
export function hasPendingActions(
  summary: ProducerTradeSummary | undefined,
): boolean {
  if (!summary) return false;

  return (
    summary.awaitingReply > 0 ||
    summary.toCoordinate > 0 ||
    summary.toConfirm > 0
  );
}
