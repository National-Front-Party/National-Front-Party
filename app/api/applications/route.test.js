import assert from "node:assert/strict";
import test from "node:test";
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
