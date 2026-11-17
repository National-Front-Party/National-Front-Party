import assert from "node:assert/strict";
import test from "node:test";
import {
  hashPassword,
  validatePasswordStrength,
  verifyPassword,
} from "./password.js";

test("hashes passwords with a salted, versioned scrypt format", async () => {
  const first = await hashPassword("SecurePassword123");
  const second = await hashPassword("SecurePassword123");

  assert.match(first, /^scrypt\$16384\$8\$1\$/);
  assert.notEqual(first, second);
  assert.equal(await verifyPassword("SecurePassword123", first), true);
  assert.equal(await verifyPassword("WrongPassword123", first), false);
});

test("rejects malformed stored hashes without throwing", async () => {
  assert.equal(await verifyPassword("password", "not-a-scrypt-hash"), false);
  assert.equal(await verifyPassword("password", null), false);
});

test("checks password length, letters, and digits", () => {
  assert.equal(validatePasswordStrength("StrongPass123").valid, true);
  assert.equal(validatePasswordStrength("short1").valid, false);
  assert.equal(validatePasswordStrength("letters-only").valid, false);
  assert.equal(validatePasswordStrength(`A1${"x".repeat(127)}`).valid, false);
});
