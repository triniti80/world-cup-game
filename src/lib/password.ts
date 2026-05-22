import { hash, verify } from "@node-rs/argon2";

// argon2id with sensible defaults. The @node-rs build is native and fast.
// argon2id is the default algorithm for @node-rs/argon2's `hash`.
// We deliberately avoid bcrypt — argon2id is the modern recommendation
// (OWASP password storage cheatsheet, RFC 9106).
//
// Parameters tuned for a single-operator login flow on commodity hardware.

const OPTS = {
  memoryCost: 19_456, // ~19 MiB
  timeCost: 2,
  parallelism: 1,
} as const;

export async function hashPassword(password: string): Promise<string> {
  return hash(password, OPTS);
}

export async function verifyPassword(stored: string, password: string): Promise<boolean> {
  try {
    return await verify(stored, password);
  } catch {
    return false;
  }
}
