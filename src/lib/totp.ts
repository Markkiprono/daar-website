import { createHmac, randomBytes, createHash, timingSafeEqual } from "node:crypto";

/**
 * TOTP (RFC 6238) — the six-digit codes from Google Authenticator, Authy,
 * 1Password and the rest.
 *
 * Implemented against the spec with node:crypto rather than pulled from a
 * package: it is about fifty lines, and an authentication dependency is one
 * more thing that can be compromised in a supply-chain attack.
 *
 * Defaults match every mainstream authenticator app: SHA-1, 6 digits,
 * 30-second steps.
 *
 * Deliberately not `server-only` so the verification logic can be unit tested.
 */

const DIGITS = 6;
const PERIOD = 30;
/** Accept the neighbouring steps too — phone clocks drift. ±1 = ±30s. */
const WINDOW = 1;

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function generateSecret(bytes = 20): string {
  return base32Encode(randomBytes(bytes));
}

function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/=+$/, "").replace(/\s/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx === -1) throw new Error("Invalid base32 character in secret");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** The code for a given counter step. */
function hotp(secret: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
  // Counter is 64-bit big-endian; write as two 32-bit halves.
  buf.writeUInt32BE(Math.floor(counter / 2 ** 32), 0);
  buf.writeUInt32BE(counter >>> 0, 4);

  const digest = createHmac("sha1", secret).update(buf).digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const binary =
    ((digest[offset]! & 0x7f) << 24) |
    ((digest[offset + 1]! & 0xff) << 16) |
    ((digest[offset + 2]! & 0xff) << 8) |
    (digest[offset + 3]! & 0xff);

  return String(binary % 10 ** DIGITS).padStart(DIGITS, "0");
}

/**
 * Verifies a submitted code, allowing for clock drift.
 * Comparison is constant-time so a response cannot be timed digit by digit.
 */
export function verifyTotp(secret: string, token: string, now = Date.now()): boolean {
  const cleaned = token.replace(/\D/g, "");
  if (cleaned.length !== DIGITS) return false;

  let key: Buffer;
  try {
    key = base32Decode(secret);
  } catch {
    return false;
  }

  const step = Math.floor(now / 1000 / PERIOD);
  const submitted = Buffer.from(cleaned);

  let ok = false;
  for (let drift = -WINDOW; drift <= WINDOW; drift++) {
    const expected = Buffer.from(hotp(key, step + drift));
    // No early exit: every candidate is compared so timing stays flat.
    if (expected.length === submitted.length && timingSafeEqual(expected, submitted)) ok = true;
  }
  return ok;
}

/** The otpauth:// URI an authenticator app scans. */
export function otpauthUrl(secret: string, account: string, issuer = "Daar Admin"): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: String(DIGITS),
    period: String(PERIOD),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

/** Groups the secret for readable manual entry. */
export function formatSecret(secret: string): string {
  return secret.replace(/(.{4})/g, "$1 ").trim();
}

// ------------------------------------------------------------
//  Recovery codes
// ------------------------------------------------------------

/** Ten single-use codes, shown once and stored only as hashes. */
export function generateBackupCodes(count = 10): string[] {
  return Array.from({ length: count }, () => {
    const raw = randomBytes(5).toString("hex").toUpperCase(); // 10 hex chars
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
}

export function hashBackupCode(code: string): string {
  return createHash("sha256").update(normaliseBackupCode(code)).digest("hex");
}

export function normaliseBackupCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}
