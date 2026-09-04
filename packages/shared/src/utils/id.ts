import type { EntityId } from "../schemas";

/**
 * Generates a standard RFC4122 v4 compliant UUID for domain entities.
 */
export function generateEntityId(): EntityId {
  if (typeof crypto !== "undefined") {
    if (typeof crypto.randomUUID === "function") {
      return crypto.randomUUID() as EntityId;
    }
    if (typeof crypto.getRandomValues === "function") {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = Array.from(bytes, (b) =>
        b.toString(16).padStart(2, "0"),
      ).join("");
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}` as EntityId;
    }
  }
  throw new Error(
    "A cryptographically secure random number generator (crypto.randomUUID or crypto.getRandomValues) is required to generate entity IDs.",
  );
}
