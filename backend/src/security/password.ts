import { hash, verify, Algorithm } from '@node-rs/argon2';

/**
 * OWASP Recommended Argon2id Configuration
 * - Memory Cost: 65,536 KiB (64 MiB)
 * - Time Cost / Iterations: 3
 * - Parallelism: 4 threads
 */
const ARGON2_OPTIONS = {
  memoryCost: 65536,
  timeCost: 3,
  outputLen: 32,
  parallelism: 4,
  algorithm: Algorithm.Argon2id,
};

/**
 * Computes a high-entropy Argon2id hash with a unique cryptographically secure salt.
 */
export async function hashPassword(plainTextPassword: string): Promise<string> {
  if (!plainTextPassword || plainTextPassword.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }
  return await hash(plainTextPassword, ARGON2_OPTIONS);
}

/**
 * Verifies a candidate plain text password against an Argon2id hash.
 * Constant-time comparison prevents timing attacks.
 */
export async function verifyPassword(
  plainTextPassword: string,
  storedHash: string
): Promise<boolean> {
  try {
    return await verify(storedHash, plainTextPassword, ARGON2_OPTIONS);
  } catch (err) {
    return false;
  }
}
