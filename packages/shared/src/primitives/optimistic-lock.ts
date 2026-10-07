import { z } from "zod";
import { ConflictError } from "./errors";

/**
 * Standard Zod schema for monotonic entity versions.
 * Must be a positive integer (>= 1).
 */
export const versionSchema = z
  .number()
  .int("Version must be an integer")
  .min(1, "Version must be at least 1");

export type EntityVersion = z.infer<typeof versionSchema>;

export interface VersionedRecord {
  version: EntityVersion;
}

/**
 * Assert that the expected incoming version matches the current entity version.
 * If expectedVersion is omitted/undefined, the lock check is bypassed for backwards compatibility.
 * Throws a domain ConflictError if versions mismatch.
 */
export function assertOptimisticLock(
  currentVersion: number,
  expectedVersion?: number,
): void {
  if (expectedVersion !== undefined && expectedVersion !== currentVersion) {
    throw new ConflictError(
      `Resource version conflict: expected ${currentVersion}, received ${expectedVersion}`,
    );
  }
}
