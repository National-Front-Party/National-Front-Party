import { promisify } from "node:util";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;
const DEFAULT_N = 16_384;
const DEFAULT_R = 8;
const DEFAULT_P = 1;
const MAXMEM = 64 * 1024 * 1024;

export function validatePasswordStrength(password) {
  const errors = [];

  if (typeof password !== "string") {
    return { valid: false, errors: ["كلمة المرور مطلوبة."] };
  }

  const length = Array.from(password).length;
  if (length < 10) errors.push("كلمة المرور يجب أن تكون 10 أحرف على الأقل.");
  if (length > 128) errors.push("كلمة المرور يجب ألا تتجاوز 128 حرفًا.");
  if (!/\p{L}/u.test(password)) errors.push("كلمة المرور يجب أن تحتوي على حرف.");
  if (!/\d/.test(password)) errors.push("كلمة المرور يجب أن تحتوي على رقم.");

  return { valid: errors.length === 0, errors };
}

export async function hashPassword(password) {
  if (typeof password !== "string") {
    throw new TypeError("Password must be a string.");
  }

  const salt = randomBytes(16);
  const derivedKey = await scrypt(password, salt, KEY_LENGTH, {
    N: DEFAULT_N,
    r: DEFAULT_R,
    p: DEFAULT_P,
    maxmem: MAXMEM,
  });

  return [
    "scrypt",
    DEFAULT_N,
    DEFAULT_R,
    DEFAULT_P,
    salt.toString("base64url"),
    Buffer.from(derivedKey).toString("base64url"),
  ].join("$");
}

export async function verifyPassword(password, storedHash) {
  if (typeof password !== "string" || typeof storedHash !== "string") {
    return false;
  }

  const [algorithm, nText, rText, pText, saltText, hashText, ...extra] =
    storedHash.split("$");
  const N = Number(nText);
  const r = Number(rText);
  const p = Number(pText);

  if (
    algorithm !== "scrypt" ||
    extra.length !== 0 ||
    !Number.isSafeInteger(N) ||
    N < 16_384 ||
    N > 131_072 ||
    (N & (N - 1)) !== 0 ||
    !Number.isSafeInteger(r) ||
    r < 1 ||
    r > 16 ||
    !Number.isSafeInteger(p) ||
    p < 1 ||
    p > 4
  ) {
    return false;
  }

  if (
    !/^[A-Za-z0-9_-]+$/.test(saltText) ||
    !/^[A-Za-z0-9_-]+$/.test(hashText)
  ) {
    return false;
  }

  let salt;
  let expected;
  try {
    salt = Buffer.from(saltText, "base64url");
    expected = Buffer.from(hashText, "base64url");
  } catch {
    return false;
  }

  if (salt.length !== 16 || expected.length !== KEY_LENGTH) return false;

  try {
    const actual = await scrypt(password, salt, expected.length, {
      N,
      r,
      p,
      maxmem: Math.max(MAXMEM, 128 * N * r + 1024 * r * p + 1024 * 1024),
    });
    return timingSafeEqual(Buffer.from(actual), expected);
  } catch {
    return false;
  }
}
