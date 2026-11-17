import assert from "node:assert/strict";
import test from "node:test";
import { GET as getMinistries } from "../../app/api/ministries/route.js";
import { GET as getSectors } from "../../app/api/request-sectors/route.js";
import { POST as submitRequest } from "../../app/api/service-requests/route.js";
import { apiDependencies } from "../services/api-dependencies.js";

const input = {
  full_name: "مواطن تجريبي",
  phone: "01012345678",
  ministry_id: 1,
  sector_id: 2,
};

function getRequest(url, ip) {
  return new Request(url, { headers: { "x-forwarded-for": ip } });
}

function postRequest(body, ip = "198.51.100.40", contentType = "application/json") {
  return new Request("http://localhost/api/service-requests", {
    method: "POST",
    headers: { "content-type": contentType, "x-forwarded-for": ip },
    body,
  });
}

test("public ministries and sectors return only dependency results and hide DB fields", async (t) => {
  t.mock.method(apiDependencies, "getActiveMinistries", async () => [
    { id: 1, name_ar: "وزارة", sort_order: 1 },
  ]);
  t.mock.method(apiDependencies, "getActiveRequestSectors", async () => [
    { id: 2, name_ar: "قطاع", sort_order: 2 },
  ]);

  const ministries = await getMinistries(getRequest("http://localhost/api/ministries", "198.51.100.41"));
  const sectors = await getSectors(getRequest("http://localhost/api/request-sectors", "198.51.100.42"));
  assert.deepEqual(await ministries.json(), { ministries: [{ id: 1, name_ar: "وزارة", sort_order: 1 }] });
  assert.deepEqual(await sectors.json(), { request_sectors: [{ id: 2, name_ar: "قطاع", sort_order: 2 }] });
  assert.equal(ministries.headers.get("cache-control"), "no-store");
});

test("public catalog endpoints safely handle database errors", async (t) => {
  t.mock.method(apiDependencies, "getActiveMinistries", async () => {
    const error = new Error("sensitive database detail");
    error.code = "DB_FAILURE";
    throw error;
  });
  const response = await getMinistries(getRequest("http://localhost/api/ministries", "198.51.100.43"));
  assert.equal(response.status, 500);
  const body = await response.text();
  assert.equal(body.includes("sensitive database detail"), false);
  assert.deepEqual(JSON.parse(body), { error: "SERVER_ERROR" });
});

test("public catalog reads use the existing per-IP rate limiter", async (t) => {
  let calls = 0;
  t.mock.method(apiDependencies, "getActiveMinistries", async () => {
    calls += 1;
    return [];
  });
  const ip = "198.51.100.98";
  for (let attempt = 0; attempt < 60; attempt += 1) {
    assert.equal((await getMinistries(getRequest("http://localhost/api/ministries", ip))).status, 200);
  }
  const limited = await getMinistries(getRequest("http://localhost/api/ministries", ip));
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get("retry-after")) > 0);
  assert.equal(calls, 60);
});

test("submission persists only validated fields and returns no personal or internal data", async (t) => {
  let calls = 0;
  t.mock.method(apiDependencies, "createServiceRequest", async (data) => {
    calls += 1;
    assert.deepEqual(data, input);
    return { ok: true, id: "private-id" };
  });
  const response = await submitRequest(postRequest(JSON.stringify(input)));
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { success: true });
  assert.equal(calls, 1);
});

test("each valid submission is independent and creates a separate request", async (t) => {
  let calls = 0;
  t.mock.method(apiDependencies, "createServiceRequest", async () => {
    calls += 1;
    return { ok: true, id: `request-${calls}` };
  });
  for (const ip of ["198.51.100.44", "198.51.100.45"]) {
    assert.equal((await submitRequest(postRequest(JSON.stringify(input), ip))).status, 201);
  }
  assert.equal(calls, 2);
});

test("submission accepts all four local mobile prefixes and rejects invalid payloads", async (t) => {
  let calls = 0;
  t.mock.method(apiDependencies, "createServiceRequest", async () => {
    calls += 1;
    return { ok: true, id: "private-id" };
  });
  for (const [index, phone] of ["01012345678", "01112345678", "01212345678", "01512345678"].entries()) {
    const response = await submitRequest(postRequest(JSON.stringify({ ...input, phone }), `198.51.100.${50 + index}`));
    assert.equal(response.status, 201, phone);
  }
  assert.equal(calls, 4);

  const invalidPhones = [
    "+201012345678", "201012345678", "02012345678", "01312345678",
    "0101234567", "010123456789", "010 12345678", "٠١٠١٢٣٤٥٦٧٨", "",
  ];
  for (const [index, phone] of invalidPhones.entries()) {
    const response = await submitRequest(postRequest(JSON.stringify({ ...input, phone }), `198.51.100.${60 + index}`));
    assert.equal(response.status, 400, phone);
  }
  for (const [index, payload] of [
    { phone: input.phone, ministry_id: 1, sector_id: 2 },
    { ...input, ministry_id: 0 },
    { ...input, sector_id: 1.5 },
    { ...input, ministry_id: "1e2" },
    { ...input, status: "completed" },
    { ...input, assigned_to: "staff-id" },
    { ...input, internal_notes: "private" },
  ].entries()) {
    const response = await submitRequest(postRequest(JSON.stringify(payload), `198.51.100.${80 + index}`));
    assert.equal(response.status, 400);
  }
  assert.equal(calls, 4);
});

test("submission rejects malformed JSON, non-JSON content types, and invalid catalog selections", async (t) => {
  t.mock.method(apiDependencies, "createServiceRequest", async () => ({ ok: false, code: "INVALID_SELECTION" }));
  assert.equal((await submitRequest(postRequest("{", "198.51.100.90"))).status, 400);
  assert.equal((await submitRequest(postRequest(JSON.stringify(input), "198.51.100.91", "text/plain"))).status, 415);
  const response = await submitRequest(postRequest(JSON.stringify(input), "198.51.100.92"));
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "INVALID_SELECTION" });
});

test("submission safely handles DB errors and applies public rate limiting", async (t) => {
  t.mock.method(apiDependencies, "createServiceRequest", async () => {
    const error = new Error("private database details");
    error.code = "DB_FAILURE";
    throw error;
  });
  const failed = await submitRequest(postRequest(JSON.stringify(input), "198.51.100.93"));
  assert.equal(failed.status, 500);
  assert.equal((await failed.text()).includes("private database details"), false);

  const rateIp = "198.51.100.94";
  for (let i = 0; i < 5; i += 1) {
    assert.equal((await submitRequest(postRequest("{}", rateIp))).status, 400);
  }
  const limited = await submitRequest(postRequest("{}", rateIp));
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get("retry-after")) > 0);
});
