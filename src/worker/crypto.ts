const encoder = new TextEncoder();

export function nowIso(): string {
  return new Date().toISOString();
}

export function randomId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function randomTokenHex(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return bytesToHex(new Uint8Array(digest));
}

export async function timingSafeEqualText(provided: string, expected: string): Promise<boolean> {
  const [providedDigest, expectedDigest] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(provided)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);

  const subtle = crypto.subtle as SubtleCrypto & {
    timingSafeEqual?: (left: ArrayBuffer, right: ArrayBuffer) => boolean;
  };

  if (subtle.timingSafeEqual) {
    return subtle.timingSafeEqual(providedDigest, expectedDigest);
  }

  const left = new Uint8Array(providedDigest);
  const right = new Uint8Array(expectedDigest);
  let diff = left.length ^ right.length;
  for (let index = 0; index < left.length && index < right.length; index += 1) {
    diff |= left[index] ^ right[index];
  }
  return diff === 0;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
