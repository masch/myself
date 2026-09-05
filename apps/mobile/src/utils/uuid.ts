import { generateEntityId } from "@myself/shared";

/**
 * Generates standard RFC4122 v4 compliant UUID.
 * Delegates to canonical @myself/shared generateEntityId().
 */
export const generateUUID = generateEntityId;
