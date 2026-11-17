import assert from "node:assert/strict";
import test from "node:test";
import { verifyTurnstile } from "./turnstile.js";

const secretKey = "test-secret";
const token = "test-response-token";

test("verifies a successful Turnstile response with form-encoded fields", async () => {
  let requestUrl;
  let requestOptions;
  const verified = await verifyTurnstile(token, "203.0.113.5", {
    secretKey,
    fetchImpl: async (url, options) => {
      requestUrl = url;
      requestOptions = options;
      return {
        ok: true,
        json: async () => ({ success: true }),
      };
    },
  });
  const fields = new URLSearchParams(requestOptions.body);

  assert.equal(verified, true);
  assert.equal(
    requestUrl,
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
  );
  assert.equal(requestOptions.method, "POST");
  assert.equal(
    requestOptions.headers["Content-Type"],
    "application/x-www-form-urlencoded",
  );
  assert.equal(fields.get("secret"), secretKey);
  assert.equal(fields.get("response"), token);
  assert.equal(fields.get("remoteip"), "203.0.113.5");
});

test("rejects an unsuccessful Turnstile response", async () => {
  const verified = await verifyTurnstile(token, null, {
    secretKey,
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({ success: false }),
    }),
  });

  assert.equal(verified, false);
});

test("fails closed when the verification request has a network error", async () => {
  const verified = await verifyTurnstile(token, null, {
    secretKey,
    fetchImpl: async () => {
      throw new Error("network failure");
    },
  });

  assert.equal(verified, false);
});

test("aborts and fails closed when verification times out", async () => {
  let wasAborted = false;
  const verified = await verifyTurnstile(token, null, {
    secretKey,
    timeoutMs: 10,
    fetchImpl: (_url, { signal }) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener(
          "abort",
          () => {
            wasAborted = true;
            reject(new Error("aborted"));
          },
          { once: true },
        );
      }),
  });

  assert.equal(verified, false);
  assert.equal(wasAborted, true);
});
