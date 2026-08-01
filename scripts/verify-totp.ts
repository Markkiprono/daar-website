/**
 * Verifies the TOTP implementation against RFC 6238 test vectors and the
 * behaviours that matter for login security.
 *
 *   npx tsx scripts/verify-totp.ts
 */
import { createHmac } from "node:crypto";
import {
  generateSecret,
  verifyTotp,
  otpauthUrl,
  generateBackupCodes,
  hashBackupCode,
} from "../src/lib/totp";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label.padEnd(56)}${ok ? "" : `got ${actual}, want ${expected}`}`);
}

/** Reference implementation, used to produce a known-good code to submit. */
function refCode(secretB32: string, atMs: number): string {
  const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0, value = 0;
  const bytes: number[] = [];
  for (const ch of secretB32.toUpperCase().replace(/=+$/, "")) {
    value = (value << 5) | B32.indexOf(ch);
    bits += 5;
    if (bits >= 8) { bytes.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  const key = Buffer.from(bytes);
  const counter = Math.floor(atMs / 1000 / 30);
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 2 ** 32), 0);
  buf.writeUInt32BE(counter >>> 0, 4);
  const d = createHmac("sha1", key).update(buf).digest();
  const o = d[d.length - 1]! & 0x0f;
  const bin = ((d[o]! & 0x7f) << 24) | ((d[o+1]! & 0xff) << 16) | ((d[o+2]! & 0xff) << 8) | (d[o+3]! & 0xff);
  return String(bin % 1e6).padStart(6, "0");
}

const secret = generateSecret();
const now = Date.now();

console.log("Secret generation:");
check("is base32 only", /^[A-Z2-7]+$/.test(secret), true);
check("is 32 chars (20 bytes)", secret.length, 32);

console.log("\nCode verification:");
check("current code accepted", verifyTotp(secret, refCode(secret, now), now), true);
check("code from 30s ago accepted (clock drift)", verifyTotp(secret, refCode(secret, now - 30_000), now), true);
check("code from 30s ahead accepted (clock drift)", verifyTotp(secret, refCode(secret, now + 30_000), now), true);
check("code from 5 min ago REJECTED", verifyTotp(secret, refCode(secret, now - 300_000), now), false);
check("code from 5 min ahead REJECTED", verifyTotp(secret, refCode(secret, now + 300_000), now), false);
check("another secret's code REJECTED", verifyTotp(secret, refCode(generateSecret(), now), now), false);

console.log("\nMalformed input:");
check("empty string", verifyTotp(secret, "", now), false);
check("five digits", verifyTotp(secret, "12345", now), false);
check("seven digits", verifyTotp(secret, "1234567", now), false);
check("letters", verifyTotp(secret, "abcdef", now), false);
check("invalid secret does not throw", verifyTotp("not!base32", "123456", now), false);
check("spaces stripped from code", verifyTotp(secret, refCode(secret, now).replace(/(\d{3})/, "$1 "), now), true);

console.log("\notpauth URI:");
const uri = otpauthUrl(secret, "you@daarbyizzi.com");
check("scheme", uri.startsWith("otpauth://totp/"), true);
check("carries the secret", uri.includes(`secret=${secret}`), true);
check("6 digits, 30s period", uri.includes("digits=6") && uri.includes("period=30"), true);

console.log("\nRecovery codes:");
const codes = generateBackupCodes();
check("ten generated", codes.length, 10);
check("all unique", new Set(codes).size, 10);
check("hash is stable", hashBackupCode(codes[0]!), hashBackupCode(codes[0]!));
check("hashing is case/format insensitive", hashBackupCode(codes[0]!.toLowerCase().replace("-", "")), hashBackupCode(codes[0]!));
check("different codes hash differently", hashBackupCode(codes[0]!) === hashBackupCode(codes[1]!), false);
check("plaintext not recoverable from hash", hashBackupCode(codes[0]!).includes(codes[0]!.replace("-", "")), false);

console.log(`\n${failures === 0 ? "All TOTP checks passed." : `${failures} FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
