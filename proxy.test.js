import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server.js";
import { proxy } from "./proxy.js";

test("blocks admin paths without a session cookie but leaves login open", async () => {
  const protectedResponse = proxy(
    new NextRequest("http://localhost:3000/api/admin/auth/me"),
  );
  assert.equal(protectedResponse.status, 401);
  assert.deepEqual(await protectedResponse.json(), { error: "UNAUTHENTICATED" });

  const loginResponse = proxy(
    new NextRequest("http://localhost:3000/api/admin/auth/login"),
  );
  assert.equal(loginResponse.status, 200);
});

test("passes admin requests with a session cookie to the API guard", () => {
  const response = proxy(
    new NextRequest("http://localhost:3000/api/admin/auth/me", {
      headers: { cookie: "staff_session=placeholder" },
    }),
  );
  assert.equal(response.status, 200);
});
