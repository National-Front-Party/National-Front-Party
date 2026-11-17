import assert from "node:assert/strict";
import test from "node:test";
import { createRateLimiter } from "./rate-limit.js";

test("allows up to the configured limit and then rejects", () => {
  const check = createRateLimiter({ limit: 2, windowMs: 1000, now: () => 10 });

  assert.deepEqual(check("client"), { allowed: true, retryAfterSeconds: 0 });
  assert.deepEqual(check("client"), { allowed: true, retryAfterSeconds: 0 });
  assert.deepEqual(check("client"), { allowed: false, retryAfterSeconds: 1 });
});

test("starts a new fixed window after expiry", () => {
  let time = 0;
  const check = createRateLimiter({
    limit: 1,
    windowMs: 1000,
    now: () => time,
  });

  assert.equal(check("client").allowed, true);
  time = 999;
  assert.deepEqual(check("client"), { allowed: false, retryAfterSeconds: 1 });
  time = 1000;
  assert.deepEqual(check("client"), { allowed: true, retryAfterSeconds: 0 });
});

test("cleans expired keys when another key is checked", () => {
  let time = 0;
  let deletedExpiredKey = false;
  const originalDelete = Map.prototype.delete;
  const expiredKey = "expired-rate-limit-test-key";
  const check = createRateLimiter({
    limit: 1,
    windowMs: 1000,
    now: () => time,
  });

  Map.prototype.delete = function (key) {
    if (key === expiredKey) {
      deletedExpiredKey = true;
    }
    return originalDelete.call(this, key);
  };

  try {
    check(expiredKey);
    time = 1000;
    check("another-client");
    assert.equal(deletedExpiredKey, true);
  } finally {
    Map.prototype.delete = originalDelete;
  }
});
