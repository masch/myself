import { type EntityId } from "./entity-id";

// RFC4122 DNS Namespace UUID: 6ba7b810-9dad-11d1-80b4-00c04fd430c8
const NAMESPACE_AUTHOR_BYTES = new Uint8Array([
  0x6b, 0xa7, 0xb8, 0x10, 0x9d, 0xad, 0x11, 0xd1, 0x80, 0xb4, 0x00, 0xc0, 0x4f,
  0xd4, 0x30, 0xc8,
]);

/**
 * Normalizes author name for deterministic identity derivation:
 * 1. Decomposes unicode diacritics / accents (NFD).
 * 2. Strips accent marks.
 * 3. Converts to lower case.
 * 4. Trims leading/trailing whitespace and collapses inner contiguous whitespace.
 */
export function normalizeAuthorName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Pure, synchronous RFC3174 SHA-1 implementation.
 * Zero external dependencies; works universally in Bun, Node, and React Native / Hermes.
 */
function sha1(bytes: Uint8Array): Uint8Array {
  const bitLength = bytes.length * 8;
  const paddingLength =
    (bytes.length % 64 < 56 ? 56 : 120) - (bytes.length % 64);
  const totalLength = bytes.length + paddingLength + 8;
  const padded = new Uint8Array(totalLength);
  padded.set(bytes);
  padded[bytes.length] = 0x80;

  const view = new DataView(padded.buffer);
  // High 32 bits of 64-bit length
  view.setUint32(totalLength - 8, Math.floor(bitLength / 0x100000000), false);
  // Low 32 bits of 64-bit length
  view.setUint32(totalLength - 4, bitLength >>> 0, false);

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;

  const w = new Uint32Array(80);

  for (let i = 0; i < totalLength; i += 64) {
    for (let j = 0; j < 16; j++) {
      w[j] = view.getUint32(i + j * 4, false);
    }
    for (let j = 16; j < 80; j++) {
      const v = w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16];
      w[j] = (v << 1) | (v >>> 31);
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;

    for (let j = 0; j < 80; j++) {
      let f = 0;
      let k = 0;
      if (j < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (j < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (j < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }

      const temp = (((a << 5) | (a >>> 27)) + f + e + k + w[j]) >>> 0;
      e = d;
      d = c;
      c = ((b << 30) | (b >>> 2)) >>> 0;
      b = a;
      a = temp;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
  }

  const result = new Uint8Array(20);
  const resultView = new DataView(result.buffer);
  resultView.setUint32(0, h0, false);
  resultView.setUint32(4, h1, false);
  resultView.setUint32(8, h2, false);
  resultView.setUint32(12, h3, false);
  resultView.setUint32(16, h4, false);

  return result;
}

/**
 * Generates a deterministic RFC4122 UUID v5 identifier for an author based on their normalized name.
 */
export function generateAuthorId(name: string): EntityId {
  const normalized = normalizeAuthorName(name);
  const encoder = new TextEncoder();
  const nameBytes = encoder.encode(normalized);

  const combined = new Uint8Array(
    NAMESPACE_AUTHOR_BYTES.length + nameBytes.length,
  );
  combined.set(NAMESPACE_AUTHOR_BYTES);
  combined.set(nameBytes, NAMESPACE_AUTHOR_BYTES.length);

  const hash = sha1(combined);

  // Set version to 5 (0101) in high nibble of byte 6
  hash[6] = (hash[6] & 0x0f) | 0x50;
  // Set variant to RFC4122 (10) in top two bits of byte 8
  hash[8] = (hash[8] & 0x3f) | 0x80;

  const hex = Array.from(hash.subarray(0, 16), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}` as EntityId;
}
