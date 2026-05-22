import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

// AES-256-GCM envelope encryption around a master key supplied via env.
//
// Storage layout for ciphertext (base64): iv(12) || ciphertext || tag(16)
//
// The master key is 32 bytes, base64-encoded, in MASTER_KEY. It is *never*
// written to the DB. Losing it loses every encrypted credential.

const ALG = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

function getMasterKey(): Buffer {
  const raw = process.env.MASTER_KEY;
  if (!raw) {
    throw new Error(
      "MASTER_KEY is not set. Generate one with `openssl rand -base64 32` and put it in .env. Without it, stored credentials cannot be decrypted.",
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      `MASTER_KEY must decode to 32 bytes (got ${key.length}). Generate with: openssl rand -base64 32`,
    );
  }
  return key;
}

export function encrypt(plaintext: string): string {
  const key = getMasterKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALG, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, ct, tag]).toString("base64");
}

export function decrypt(b64: string): string {
  const key = getMasterKey();
  const buf = Buffer.from(b64, "base64");
  if (buf.length < IV_LEN + TAG_LEN) {
    throw new Error("ciphertext too short");
  }
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(buf.length - TAG_LEN);
  const ct = buf.subarray(IV_LEN, buf.length - TAG_LEN);
  const decipher = createDecipheriv(ALG, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}

// Sanity-check at startup that the master key decrypts what it encrypts.
// Call this once during boot; throws on mismatch.
export function assertCryptoConfigured(): void {
  const probe = "axi-crypto-probe-" + Date.now();
  const round = decrypt(encrypt(probe));
  if (round !== probe) {
    throw new Error("Crypto self-check failed: encrypt/decrypt round-trip mismatch.");
  }
}
