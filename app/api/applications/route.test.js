import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "../governorates/route.js";
import { apiDependencies } from "../../../lib/services/api-dependencies.js";
import { POST } from "./route.js";

function postRequest(body, headers = {}) {
  return new Request("http://localhost/api/applications", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body,
  });
}

function validApplication(overrides = {}) {
  return {
    type: "member",
    full_name: "محمد علي أحمد حسن",
    phone: "01012345678",
    national_id: "30001010012330",
    governorate_id: 1,
    terms_accepted: true,
    ...overrides,
  };
}

function withTurnstileSecret(secret, callback) {
  const previousSecret = process.env.TURNSTILE_SECRET_KEY;
  if (secret === undefined) {
    delete process.env.TURNSTILE_SECRET_KEY;
  } else {
    process.env.TURNSTILE_SECRET_KEY = secret;
  }

  return Promise.resolve()
    .then(callback)
    .finally(() => {
      if (previousSecret === undefined) {
        delete process.env.TURNSTILE_SECRET_KEY;
      } else {
        process.env.TURNSTILE_SECRET_KEY = previousSecret;
      }
    });
}

test("returns JSON validation error for malformed JSON", async () => {
  const response = await POST(postRequest("{"));

  assert.equal(response.status, 400);
  assert.match(response.headers.get("content-type"), /application\/json/);
  assert.deepEqual(await response.json(), { error: "VALIDATION" });
});

test("returns field errors without echoing submitted values", async () => {
  const response = await POST(
    postRequest(
      JSON.stringify({
        type: "member",
        full_name: "محمد علي أحمد",
        phone: "01012345678",
        national_id: "30001010012330",
        governorate_id: 1,
        terms_accepted: true,
      }),
    ),
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error, "VALIDATION");
  assert.deepEqual(body.issues.full_name, ["الاسم لازم يكون رباعي"]);
  assert.equal(JSON.stringify(body).includes("محمد علي أحمد"), false);
  assert.equal(JSON.stringify(body).includes("01012345678"), false);
  assert.equal(JSON.stringify(body).includes("30001010012330"), false);
});

test("rejects an invalid type and unknown field", async () => {
  const response = await POST(
    postRequest(
      JSON.stringify({
        type: "x",
        full_name: "محمد علي أحمد حسن",
        phone: "01012345678",
        national_id: "30001010012330",
        governorate_id: 1,
        terms_accepted: true,
        extra: "unexpected",
      }),
    ),
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error, "VALIDATION");
  assert.ok(body.issues.type);
  assert.equal(JSON.stringify(body).includes("unexpected"), false);
});

test("rejects requests with a non-JSON content type", async () => {
  const response = await POST(
    new Request("http://localhost/api/applications", {
      method: "POST",
      headers: {
        "content-type": "text/plain",
        "x-forwarded-for": "198.51.100.11",
      },
      body: "{}",
    }),
  );

  assert.equal(response.status, 415);
  assert.deepEqual(await response.json(), {
    error: "UNSUPPORTED_MEDIA_TYPE",
  });
});

test("rejects request bodies larger than 10 KB", async () => {
  const response = await POST(
    postRequest("a".repeat(10 * 1024 + 1), {
      "x-forwarded-for": "198.51.100.12",
    }),
  );

  assert.equal(response.status, 413);
  assert.deepEqual(await response.json(), { error: "PAYLOAD_TOO_LARGE" });
});

test("rate limits by IP before parsing the request body", async () => {
  const headers = { "x-forwarded-for": "198.51.100.13" };

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await POST(postRequest("{}", headers));
    assert.equal(response.status, 400);
  }

  const response = await POST(postRequest("{}", headers));
  assert.equal(response.status, 429);
  assert.deepEqual(await response.json(), { error: "RATE_LIMITED" });
  assert.ok(Number(response.headers.get("Retry-After")) > 0);
});

test("returns a fake success for a filled honeypot without calling services", async (t) => {
  let createCalls = 0;
  let captchaCalls = 0;
  t.mock.method(apiDependencies, "createApplication", async () => {
    createCalls += 1;
    throw new Error("createApplication should not be called");
  });
  t.mock.method(apiDependencies, "verifyTurnstile", async () => {
    captchaCalls += 1;
    return true;
  });

  await withTurnstileSecret("test-secret", async () => {
    const response = await POST(
      postRequest(
        JSON.stringify(validApplication({ website: "bot-filled" })),
        { "x-forwarded-for": "198.51.100.14" },
      ),
    );
    const body = await response.json();

    assert.equal(response.status, 201);
    assert.match(body.application_no, /^\d+$/);
  });

  assert.equal(createCalls, 0);
  assert.equal(captchaCalls, 0);
});

test("skips Turnstile when the secret key is missing", async (t) => {
  let createCalls = 0;
  let captchaCalls = 0;
  t.mock.method(apiDependencies, "createApplication", async () => {
    createCalls += 1;
    return { ok: true, applicationNo: "123" };
  });
  t.mock.method(apiDependencies, "verifyTurnstile", async () => {
    captchaCalls += 1;
    return false;
  });

  await withTurnstileSecret(undefined, async () => {
    const response = await POST(
      postRequest(JSON.stringify(validApplication()), {
        "x-forwarded-for": "198.51.100.15",
      }),
    );

    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), { application_no: "123" });
  });

  assert.equal(createCalls, 1);
  assert.equal(captchaCalls, 0);
});

test("requires a token when Turnstile is enabled", async (t) => {
  let createCalls = 0;
  let captchaCalls = 0;
  t.mock.method(apiDependencies, "createApplication", async () => {
    createCalls += 1;
    return { ok: true, applicationNo: "123" };
  });
  t.mock.method(apiDependencies, "verifyTurnstile", async () => {
    captchaCalls += 1;
    return true;
  });

  await withTurnstileSecret("test-secret", async () => {
    const response = await POST(
      postRequest(JSON.stringify(validApplication()), {
        "x-forwarded-for": "198.51.100.16",
      }),
    );

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "CAPTCHA_REQUIRED" });
  });

  assert.equal(createCalls, 0);
  assert.equal(captchaCalls, 0);
});

test("rejects failed Turnstile verification", async (t) => {
  let createCalls = 0;
  t.mock.method(apiDependencies, "createApplication", async () => {
    createCalls += 1;
    return { ok: true, applicationNo: "123" };
  });
  t.mock.method(apiDependencies, "verifyTurnstile", async () => false);

  await withTurnstileSecret("test-secret", async () => {
    const response = await POST(
      postRequest(
        JSON.stringify(validApplication({ turnstileToken: "test-token" })),
        { "x-forwarded-for": "198.51.100.17" },
      ),
    );

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "CAPTCHA_FAILED" });
  });

  assert.equal(createCalls, 0);
});

test("rate limits the governorates endpoint independently by IP", async (t) => {
  let serviceCalls = 0;
  t.mock.method(apiDependencies, "getActiveGovernorates", async () => {
    serviceCalls += 1;
    return [];
  });
  const request = () =>
    new Request("http://localhost/api/governorates", {
      headers: { "x-forwarded-for": "198.51.100.18" },
    });

  for (let attempt = 0; attempt < 60; attempt += 1) {
    const response = await GET(request());
    assert.equal(response.status, 200);
  }

  const response = await GET(request());
  assert.equal(response.status, 429);
  assert.deepEqual(await response.json(), { error: "RATE_LIMITED" });
  assert.equal(serviceCalls, 60);
  assert.ok(Number(response.headers.get("Retry-After")) > 0);
});
