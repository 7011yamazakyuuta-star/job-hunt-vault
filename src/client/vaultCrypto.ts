const encoder = new TextEncoder();
const decoder = new TextDecoder();

export type EncryptedVaultPayload = {
  version: 1;
  kdf: "PBKDF2-SHA-256";
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
};

export async function encryptVaultText(plainText: string, passphrase: string): Promise<EncryptedVaultPayload> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveVaultKey(passphrase, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv) },
    key,
    encoder.encode(plainText),
  );

  return {
    version: 1,
    kdf: "PBKDF2-SHA-256",
    iterations: 210000,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ciphertext)),
  };
}

export async function decryptVaultText(payload: EncryptedVaultPayload, passphrase: string): Promise<string> {
  const salt = fromBase64(payload.salt);
  const iv = fromBase64(payload.iv);
  const key = await deriveVaultKey(passphrase, salt, payload.iterations);
  const plainText = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(fromBase64(payload.ciphertext)),
  );
  return decoder.decode(plainText);
}

async function deriveVaultKey(passphrase: string, salt: Uint8Array, iterations = 210000): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(passphrase), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: toArrayBuffer(salt),
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
