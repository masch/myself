import { describe, expect, it } from "bun:test";
import { assertOptimisticLock, versionSchema } from "../optimistic-lock";
import { ConflictError } from "../errors";

describe("versionSchema", () => {
  it("validates positive integers and rejects invalid values", () => {
    expect(versionSchema.parse(1)).toBe(1);
    expect(versionSchema.parse(5)).toBe(5);
    expect(() => versionSchema.parse(0)).toThrow();
    expect(() => versionSchema.parse(-1)).toThrow();
    expect(() => versionSchema.parse(1.5)).toThrow();
  });

  it("leaves optional version as undefined when omitted", () => {
    const optionalSchema = versionSchema.optional();
    expect(optionalSchema.parse(undefined)).toBeUndefined();
  });
});

describe("assertOptimisticLock", () => {
  it("passes when expectedVersion matches currentVersion", () => {
    expect(() => assertOptimisticLock(1, 1)).not.toThrow();
    expect(() => assertOptimisticLock(5, 5)).not.toThrow();
  });

  it("passes when expectedVersion is omitted (backwards compatibility / initial sync)", () => {
    expect(() => assertOptimisticLock(1, undefined)).not.toThrow();
    expect(() => assertOptimisticLock(5, undefined)).not.toThrow();
  });

  it("throws ConflictError when expectedVersion does not match currentVersion", () => {
    expect(() => assertOptimisticLock(2, 1)).toThrow(ConflictError);
    expect(() => assertOptimisticLock(1, 2)).toThrow(ConflictError);

    try {
      assertOptimisticLock(3, 1);
    } catch (err) {
      expect(err instanceof ConflictError).toBe(true);
      expect((err as ConflictError).message).toContain(
        "expected 3, received 1",
      );
    }
  });
});
