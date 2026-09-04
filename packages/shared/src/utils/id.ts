import type { EntityId } from "../schemas";

/**
 * Generates a standard RFC4122 v4 compliant UUID for domain entities.
 */
export function generateEntityId(): EntityId {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID() as EntityId;
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  }) as EntityId;
}
