import { describe, expect, it, mock } from "bun:test";
import {
  installCryptoPolyfill,
  type CryptoModuleLike,
  type TargetGlobalLike,
} from "@/infrastructure/crypto/polyfill";
import { generateUUID } from "@/utils/uuid";

describe("Crypto Polyfill & UUID Generator", () => {
  it("ensures globalThis.crypto is defined with randomUUID and getRandomValues", () => {
    expect(globalThis.crypto).toBeDefined();
    expect(typeof globalThis.crypto.randomUUID).toBe("function");
    expect(typeof globalThis.crypto.getRandomValues).toBe("function");
  });

  it("generates RFC4122 v4 compliant UUID using generateUUID()", () => {
    const id = generateUUID();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("fills TypedArray with random values using getRandomValues()", () => {
    const buffer = new Uint8Array(16);
    globalThis.crypto.getRandomValues(buffer);
    const hasNonZero = buffer.some((byte) => byte !== 0);
    expect(hasNonZero).toBe(true);
  });

  describe("installCryptoPolyfill Unit Tests", () => {
    it("installs polyfill on an environment where target.crypto is undefined", () => {
      const target: TargetGlobalLike = {};
      const mockCrypto: CryptoModuleLike = {
        randomUUID: mock(() => "custom-uuid-1234"),
        getRandomValues: mock(<T extends ArrayBufferView | null>(arr: T): T => {
          if (arr) {
            new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength).fill(42);
          }
          return arr;
        }),
      };

      installCryptoPolyfill(target, mockCrypto);

      expect(target.crypto).toBeDefined();
      expect(target.crypto!.randomUUID!()).toBe("custom-uuid-1234");
      expect(mockCrypto.randomUUID).toHaveBeenCalledTimes(1);

      const buf = new Uint8Array(4);
      target.crypto!.getRandomValues!(buf);
      expect(buf[0]).toBe(42);
      expect(mockCrypto.getRandomValues).toHaveBeenCalledTimes(1);

      // Branch: null/falsy array passed to getRandomValues
      const nullResult = target.crypto!.getRandomValues!(null);
      expect(nullResult).toBeNull();
    });

    it("does not overwrite existing randomUUID and getRandomValues if already present", () => {
      const existingRandomUUID = mock(() => "existing-uuid");
      const existingGetRandomValues = mock(
        <T extends ArrayBufferView | null>(arr: T): T => arr,
      );

      const target: TargetGlobalLike = {
        crypto: {
          randomUUID: existingRandomUUID,
          getRandomValues: existingGetRandomValues,
        },
      };

      const mockCrypto: CryptoModuleLike = {
        randomUUID: mock(() => "should-not-be-called"),
        getRandomValues: mock(
          <T extends ArrayBufferView | null>(arr: T): T => arr,
        ),
      };

      installCryptoPolyfill(target, mockCrypto);

      expect(target.crypto!.randomUUID!()).toBe("existing-uuid");
      expect(mockCrypto.randomUUID).not.toHaveBeenCalled();
      expect(existingRandomUUID).toHaveBeenCalledTimes(1);
    });

    it("polyfills only missing randomUUID when getRandomValues exists", () => {
      const existingGetRandomValues = mock(
        <T extends ArrayBufferView | null>(arr: T): T => arr,
      );
      const target: TargetGlobalLike = {
        crypto: {
          getRandomValues: existingGetRandomValues,
        },
      };

      const mockCrypto: CryptoModuleLike = {
        randomUUID: mock(() => "injected-uuid"),
        getRandomValues: mock(
          <T extends ArrayBufferView | null>(arr: T): T => arr,
        ),
      };

      installCryptoPolyfill(target, mockCrypto);

      expect(target.crypto!.randomUUID!()).toBe("injected-uuid");
      expect(target.crypto!.getRandomValues).toBe(existingGetRandomValues);
    });

    it("polyfills only missing getRandomValues when randomUUID exists", () => {
      const existingRandomUUID = mock(() => "preserved-uuid");
      const target: TargetGlobalLike = {
        crypto: {
          randomUUID: existingRandomUUID,
        },
      };

      const mockCrypto: CryptoModuleLike = {
        randomUUID: mock(() => "should-not-use"),
        getRandomValues: mock(<T extends ArrayBufferView | null>(arr: T): T => {
          if (arr) {
            new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength).fill(7);
          }
          return arr;
        }),
      };

      installCryptoPolyfill(target, mockCrypto);

      expect(target.crypto!.randomUUID).toBe(existingRandomUUID);
      const buf = new Uint8Array(2);
      target.crypto!.getRandomValues!(buf);
      expect(buf[0]).toBe(7);
    });

    it("falls back to default expo-crypto module when cryptoModule parameter is omitted", () => {
      const target: TargetGlobalLike = {};
      // Omit 2nd param: triggers `cryptoModule ?? require("expo-crypto")`
      installCryptoPolyfill(target);

      expect(target.crypto).toBeDefined();
      expect(typeof target.crypto!.randomUUID).toBe("function");
      expect(typeof target.crypto!.getRandomValues).toBe("function");
      const uuid = target.crypto!.randomUUID!();
      expect(uuid).toBe("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d");
    });
  });
});
