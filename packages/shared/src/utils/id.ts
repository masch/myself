import type { EntityId } from "../schemas";

/**
 * Generates a standard RFC4122 v4 compliant UUID for domain entities.
 */
export function generateEntityId(): EntityId {
  return crypto.randomUUID() as EntityId;
}
