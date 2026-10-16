import type { TradeMatchStatus } from "./types";

const ALLOWED_TRANSITIONS: Record<TradeMatchStatus, TradeMatchStatus[]> = {
  PENDING: [
    "COUNTER_OFFERED",
    "ACCEPTED",
    "REJECTED",
    "EXPIRED",
    "CANCELLED_INSUFFICIENT_STOCK",
  ],
  COUNTER_OFFERED: [
    "ACCEPTED",
    "REJECTED",
    "EXPIRED",
    "CANCELLED_INSUFFICIENT_STOCK",
  ],
  ACCEPTED: ["WAITING_DELIVERY", "CANCELLED_BY_PRODUCER"],
  WAITING_DELIVERY: ["COMPLETED", "CANCELLED_BY_PRODUCER"],
  COMPLETED: [],
  REJECTED: [],
  EXPIRED: [],
  CANCELLED_INSUFFICIENT_STOCK: [],
  CANCELLED_BY_PRODUCER: [],
};

export function canTransition(
  from: TradeMatchStatus,
  to: TradeMatchStatus,
): boolean {
  const allowed = ALLOWED_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

export function getAllowedTransitions(
  status: TradeMatchStatus,
): TradeMatchStatus[] {
  return ALLOWED_TRANSITIONS[status] ?? [];
}

export function isTerminalStatus(status: TradeMatchStatus): boolean {
  return getAllowedTransitions(status).length === 0;
}

export function assertValidTransition(
  from: TradeMatchStatus,
  to: TradeMatchStatus,
): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid transition from ${from} to ${to}`);
  }
}

export function requiresStockDeduction(
  from: TradeMatchStatus,
  to: TradeMatchStatus,
): boolean {
  return (
    (from === "PENDING" || from === "COUNTER_OFFERED") && to === "ACCEPTED"
  );
}

export function requiresStockRollback(
  from: TradeMatchStatus,
  to: TradeMatchStatus,
): boolean {
  return (
    (from === "ACCEPTED" || from === "WAITING_DELIVERY") &&
    to === "CANCELLED_BY_PRODUCER"
  );
}
