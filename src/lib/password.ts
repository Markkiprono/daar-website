import "server-only";
import { randomBytes, scrypt as _scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(_scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const KEYLEN = 64;
const SALT_BYTES = 16;

/**
 * scrypt from Node's standard library — memory-hard, no native build step,
 * no dependency to audit. Sufficient for a single-admin login.
 *
 * Format: <salt-hex>:<hash-hex>
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const hash = await scrypt(password, salt, KEYLEN);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

/**
 * Constant-time comparison. Returns false rather than throwing on a
 * malformed stored value, so a corrupted row can't crash the login route.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;

  let expected: Buffer;
  try {
    expected = Buffer.from(hashHex, "hex");
  } catch {
    return false;
  }
  if (expected.length !== KEYLEN) return false;

  const actual = await scrypt(password, Buffer.from(saltHex, "hex"), KEYLEN);
  return timingSafeEqual(actual, expected);
}
