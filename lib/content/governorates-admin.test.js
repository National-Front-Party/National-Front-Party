import test from "node:test";
import assert from "node:assert/strict";
import {
  createGovernorate,
  deleteGovernorate,
  listGovernoratesAdmin,
  setGovernorateActive,
  updateGovernorate,
} from "../services/governorates.js";
import {
  createAdminGovernoratesCollectionHandlers,
  createAdminGovernorateItemHandlers,
  createAdminGovernorateStatusHandler,
} from "./handlers/governorates.js";

function mockStaff(role = "super_admin") {
  return { id: "staff-1", role, is_active: true };
}

function mockStaffGuard(staff = mockStaff()) {
  return async () => staff;
}

test("governorates admin service: list, create, update, status, and delete with relations check", async (t) => {
  await t.test("lists all governorates with counts", async () => {
    const mockDb = {
      governorates: {
        findMany: async () => [
          {
            id: 1,
            name_ar: "القاهرة",
            code: "EG-C",
            sort_order: 1,
            is_active: true,
            created_at: new Date(),
            _count: {
              governorate_secretariats_info: 5,
              members: 10,
              membership_applications: 20,
            },
          },
        ],
      },
    };

    const res = await listGovernoratesAdmin(mockDb);
    assert.equal(res.length, 1);
    assert.equal(res[0].name_ar, "القاهرة");
    assert.equal(res[0].code, "EG-C");
    assert.equal(res[0].secretariats_count, 5);
    assert.equal(res[0].total_linked, 35);
  });

  await t.test("creates governorate with uppercase code and default is_active", async () => {
    let createdData = null;
    const mockDb = {
      $transaction: async (fn) => fn(mockDb),
      governorates: {
        create: async ({ data }) => {
          createdData = data;
          return { id: 2, ...data, created_at: new Date() };
        },
      },
      staff_audit_log: {
        create: async () => ({ id: "audit-1" }),
      },
    };

    const res = await createGovernorate(
      { name_ar: "مطروح", code: "eg-mat", sort_order: 10 },
      mockStaff(),
      mockDb
    );

    assert.equal(res.id, 2);
    assert.equal(createdData.code, "EG-MAT");
    assert.equal(createdData.is_active, true);
  });

  await t.test("updates governorate fields", async () => {
    let updatedData = null;
    const mockDb = {
      $transaction: async (fn) => fn(mockDb),
      governorates: {
        update: async ({ where, data }) => {
          updatedData = data;
          return { id: where.id, ...data, created_at: new Date() };
        },
      },
      staff_audit_log: {
        create: async () => ({ id: "audit-2" }),
      },
    };

    const res = await updateGovernorate(
      1,
      { name_ar: "القاهرة الكبرى", is_active: false },
      mockStaff(),
      mockDb
    );

    assert.equal(res.id, 1);
    assert.equal(updatedData.name_ar, "القاهرة الكبرى");
    assert.equal(updatedData.is_active, false);
  });

  await t.test("setGovernorateActive toggles active status", async () => {
    let toggledActive = null;
    const mockDb = {
      $transaction: async (fn) => fn(mockDb),
      governorates: {
        update: async ({ data }) => {
          toggledActive = data.is_active;
          return { id: 1, is_active: data.is_active };
        },
      },
      staff_audit_log: {
        create: async () => ({ id: "audit-3" }),
      },
    };

    await setGovernorateActive(1, false, mockStaff(), mockDb);
    assert.equal(toggledActive, false);

    await setGovernorateActive(1, true, mockStaff(), mockDb);
    assert.equal(toggledActive, true);
  });

  await t.test("deleteGovernorate rejects deletion when linked records exist", async () => {
    const mockDb = {
      $transaction: async (fn) => fn(mockDb),
      governorates: {
        findUnique: async () => ({
          id: 1,
          name_ar: "القاهرة",
          code: "EG-C",
          _count: {
            governorate_secretariats_info: 2,
            members: 0,
            membership_applications: 0,
          },
        }),
      },
    };

    await assert.rejects(
      async () => deleteGovernorate(1, mockStaff(), mockDb),
      (err) => err.code === "GOVERNORATE_HAS_DATA"
    );
  });

  await t.test("deleteGovernorate allows deletion when no linked records exist", async () => {
    let deletedId = null;
    const mockDb = {
      $transaction: async (fn) => fn(mockDb),
      governorates: {
        findUnique: async () => ({
          id: 99,
          name_ar: "محافظة تجريبية",
          code: "EG-TEST",
          _count: {
            governorate_secretariats_info: 0,
            members: 0,
            membership_applications: 0,
          },
        }),
        delete: async ({ where }) => {
          deletedId = where.id;
          return { id: where.id };
        },
      },
      staff_audit_log: {
        create: async () => ({ id: "audit-4" }),
      },
    };

    const res = await deleteGovernorate(99, mockStaff(), mockDb);
    assert.deepEqual(res, { deleted: true });
    assert.equal(deletedId, 99);
  });
});

test("governorates admin handlers: collection, item, and status routing", async (t) => {
  await t.test("GET collection returns list", async () => {
    const handlers = createAdminGovernoratesCollectionHandlers({
      guard: mockStaffGuard(),
      listFn: async () => [{ id: 1, name_ar: "القاهرة", code: "EG-C", is_active: true }],
    });

    const req = new Request("http://localhost/api/admin/content/governorates");
    const res = await handlers.GET(req);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.governorates.length, 1);
  });

  await t.test("POST collection creates governorate and validates input", async () => {
    const handlers = createAdminGovernoratesCollectionHandlers({
      guard: mockStaffGuard(),
      createFn: async (val) => ({ id: 5, ...val }),
    });

    // Invalid body
    const badReq = new Request("http://localhost/api/admin/content/governorates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name_ar: "" }),
    });
    const badRes = await handlers.POST(badReq);
    assert.equal(badRes.status, 400);

    // Valid body
    const goodReq = new Request("http://localhost/api/admin/content/governorates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name_ar: "سوهاج", code: "EG-SHG", sort_order: 12 }),
    });
    const goodRes = await handlers.POST(goodReq);
    assert.equal(goodRes.status, 201);
    const data = await goodRes.json();
    assert.equal(data.governorate.code, "EG-SHG");
  });

  await t.test("DELETE item handles conflict when governorate has data", async () => {
    const handlers = createAdminGovernorateItemHandlers({
      guard: mockStaffGuard(),
      deleteFn: async () => {
        const error = new Error("GOVERNORATE_HAS_DATA");
        error.code = "GOVERNORATE_HAS_DATA";
        throw error;
      },
    });

    const req = new Request("http://localhost/api/admin/content/governorates/1", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: true }),
    });
    const res = await handlers.DELETE(req, { params: Promise.resolve({ id: "1" }) });
    assert.equal(res.status, 409);
    const data = await res.json();
    assert.equal(data.error, "GOVERNORATE_HAS_DATA");
  });

  await t.test("PATCH status toggles is_active", async () => {
    let capturedActive = null;
    const handler = createAdminGovernorateStatusHandler({
      guard: mockStaffGuard(),
      setFn: async (id, isActive) => {
        capturedActive = isActive;
        return { id, is_active: isActive };
      },
    });

    const req = new Request("http://localhost/api/admin/content/governorates/1/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: false }),
    });
    const res = await handler(req, { params: Promise.resolve({ id: "1" }) });
    assert.equal(res.status, 200);
    assert.equal(capturedActive, false);
  });
});
