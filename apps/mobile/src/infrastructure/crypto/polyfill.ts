export interface CryptoModuleLike {
  randomUUID: () => string;
  getRandomValues: <T extends ArrayBufferView | null>(array: T) => T;
}

export interface TargetGlobalLike {
  crypto?: {
    randomUUID?: () => string;
    getRandomValues?: <T extends ArrayBufferView | null>(array: T) => T;
  };
}

/**
 * Polyfills the standard Web Crypto API (`crypto.randomUUID` and `crypto.getRandomValues`)
 * in environments where it is not globally present (e.g., React Native Hermes on Android/iOS).
 */
export function installCryptoPolyfill(
  target: TargetGlobalLike = globalThis,
  cryptoModule?: CryptoModuleLike,
): void {
  const hasRandomUUID = typeof target.crypto?.randomUUID === "function";
  const hasGetRandomValues =
    typeof target.crypto?.getRandomValues === "function";

  if (!hasRandomUUID || !hasGetRandomValues) {
    // Lazily load expo-crypto only when standard Web Crypto is missing in the environment
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Crypto: CryptoModuleLike = cryptoModule ?? require("expo-crypto");

    if (typeof target.crypto === "undefined") {
      target.crypto = {};
    }

    if (!hasRandomUUID) {
      target.crypto.randomUUID = () => Crypto.randomUUID();
    }

    if (!hasGetRandomValues) {
      target.crypto.getRandomValues = <T extends ArrayBufferView | null>(
        array: T,
      ): T => {
        if (array) {
          return Crypto.getRandomValues(array);
        }
        return array;
      };
    }
  }
}

// Automatically install on module import
installCryptoPolyfill();
