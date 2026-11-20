import assert from "node:assert/strict";
import test from "node:test";

import { hasPermission } from "../auth/permissions.js";
import {
  createAdminPartyProgramDraftHandlers,
  createAdminPartyProgramHandlers,
  createAdminPartyProgramPublishHandler,
} from "../content/handlers/party-program.js";
import {
  discardPartyProgramDraft,
  getPartyProgramAdmin,
  lockPartyProgram,
  publishPartyProgramDraft,
  savePartyProgramDraft,
} from "./content-party-program.js";

const actor = {
  id: "11111111-1111-4111-8111-111111111111",
  full_name: "Content Editor",
  email: "editor@example.test",
  role: "content_editor",
};

const contentEditor = actor;

const superAdmin = {
  id: "22222222-2222-4222-8222-222222222222",
  full_name: "Super Admin",
  email: "admin@example.test",
  role: "super_admin",
};

const officer = {
  id: "33333333-3333-4333-8333-333333333333",
  full_name: "Membership Officer",
  email: "officer@example.test",
  role: "membership_officer",
};

const ALLOWED_AUDIT_KEYS = new Set([
  "previous_role",
  "new_role",
  "previous_is_active",
  "new_is_active",
  "changed_fields",
  "entity_type",
  "entity_id",
  "slug",
  "cascade_deleted_people_count",
  "deleted_people_count",
]);

function makeDb(modelImpls = {}, { failAudit = false } = {}) {
  const calls = [];
  const audits = [];
  const makeClient = (label) => {
    const client = { _label: label };
    client.$queryRaw = async (strings, ...values) => {
      const sql = Array.isArray(strings) ? strings.join("?") : String(strings);
      calls.push({ model: "$queryRaw", method: "$queryRaw", sql, values, tx: label });
      if (typeof modelImpls.$queryRaw === "function") {
        return modelImpls.$queryRaw(strings, ...values);
      }
      if (sql.includes('FROM "party_programs"') && sql.includes("FOR UPDATE")) {
        return [{ id: 1, title: "برنامج الحزب" }];
      }
      return [];
    };
    client.staff_audit_log = {
      create: async (args) => {
        calls.push({ model: "staff_audit_log", method: "create", args, tx: label });
        if (failAudit) {
          throw new Error("AUDIT_FAILED");
        }
        // Emulate PostgreSQL check constraint staff_audit_log_details_safe_keys_check
        if (args.data.details) {
          for (const key of Object.keys(args.data.details)) {
            if (!ALLOWED_AUDIT_KEYS.has(key)) {
              throw new Error(`Check constraint violation: key '${key}' not allowed in staff_audit_log details`);
            }
          }
        }
        audits.push(args.data);
        return { id: BigInt(audits.length), ...args.data };
      },
    };
    for (const [model, methods] of Object.entries(modelImpls)) {
      if (model.startsWith("$")) continue;
      client[model] = {};
      for (const [method, fn] of Object.entries(methods)) {
        client[model][method] = async (args) => {
          calls.push({ model, method, args, tx: label });
          return fn(args, { client, calls, audits });
        };
      }
    }
    return client;
  };
  const db = makeClient("db");
  db.$transaction = async (cb) => cb(makeClient("tx"));
  return { db, calls, audits };
}

function req(method, url, body) {
  const headers = new Headers({ origin: "http://localhost:3000" });
  if (body !== undefined) headers.set("content-type", "application/json");
  return new Request(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function guardByRole(user) {
  return async (_request, options) => {
    if (!user) {
      return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    if (!hasPermission(user.role, options.permission)) {
      return Response.json({ error: "FORBIDDEN" }, { status: 403 });
    }
    return user;
  };
}

// ---------------------------------------------------------------------------
// Lock and Concurrency Tests (In-Memory Transactional Mock)
// NOTE: These tests verify lock acquisition, lock-before-read order, and
// serialized state transitions. True PostgreSQL concurrency requires a live DB.
// ---------------------------------------------------------------------------

test("lockPartyProgram: acquires row lock with FOR UPDATE on published row", async () => {
  const calls = [];
  const fakeTx = {
    $queryRaw: async (strings) => {
      const sql = strings.join("");
      calls.push(sql);
      return [{ id: 1, title: "برنامج الحزب" }];
    },
  };

  const locked = await lockPartyProgram(fakeTx);
  assert.equal(locked.id, 1);
  assert.equal(calls.length, 1);
  assert.ok(calls[0].includes('FROM "party_programs"'));
  assert.ok(calls[0].includes('"is_published" = true'));
  assert.ok(calls[0].includes("FOR UPDATE"));
});

test("lockPartyProgram: throws error when $queryRaw is missing", async () => {
  await assert.rejects(
    async () => lockPartyProgram({}),
    (err) => err instanceof TypeError && err.message.includes("$queryRaw"),
  );
});

test("lockPartyProgram: throws NO_PUBLISHED_PARTY_PROGRAM when no published row exists", async () => {
  const fakeTx = {
    $queryRaw: async () => [],
  };

  await assert.rejects(
    async () => lockPartyProgram(fakeTx),
    (err) => err.code === "NO_PUBLISHED_PARTY_PROGRAM" && err.status === 500,
  );
});

test("lock order: savePartyProgramDraft acquires row lock BEFORE findFirst or write", async () => {
  const { db, calls } = makeDb({
    party_programs: {
      findFirst: async () => null,
      create: async ({ data }) => ({ id: 10, ...data, created_at: new Date(), updated_at: new Date() }),
      deleteMany: async () => ({ count: 0 }),
    },
  });

  await savePartyProgramDraft({ body: "نص مسودة" }, actor, db);

  const txCalls = calls.filter((c) => c.tx === "tx");
  assert.ok(txCalls.length >= 2, "must have transaction calls");
  assert.equal(txCalls[0].model, "$queryRaw", "First tx operation must be row lock");
  assert.ok(txCalls[0].sql.includes("FOR UPDATE"), "Must use FOR UPDATE");
  assert.equal(txCalls[1].model, "party_programs", "Second tx operation is draft check");
  assert.equal(txCalls[1].method, "findFirst");
});

test("lock order: publishPartyProgramDraft acquires row lock BEFORE draft check or update", async () => {
  const draft = { id: 9, title: "مسودة", body: "محتوى", source_note: null, is_published: false };
  const pub = { id: 1, title: "برنامج", body: "قديم", source_note: null, is_published: true };

  const { db, calls } = makeDb({
    party_programs: {
      findFirst: async ({ where }) => {
        if (where.is_published === false) return draft;
        return pub;
      },
      update: async ({ data }) => ({ ...pub, ...data }),
      delete: async () => draft,
      deleteMany: async () => ({ count: 0 }),
    },
  });

  await publishPartyProgramDraft(actor, db);

  const txCalls = calls.filter((c) => c.tx === "tx");
  assert.equal(txCalls[0].model, "$queryRaw", "First tx operation must be lockPartyProgram");
  assert.ok(txCalls[0].sql.includes("FOR UPDATE"));
  assert.equal(txCalls[1].model, "party_programs");
  assert.equal(txCalls[1].method, "findFirst");
});

test("lock order: discardPartyProgramDraft acquires row lock BEFORE draft check or delete", async () => {
  const draft = { id: 15, title: "مسودة", body: "محتوى", is_published: false };

  const { db, calls } = makeDb({
    party_programs: {
      findFirst: async () => draft,
      deleteMany: async () => ({ count: 1 }),
    },
  });

  await discardPartyProgramDraft(actor, db);

  const txCalls = calls.filter((c) => c.tx === "tx");
  assert.equal(txCalls[0].model, "$queryRaw", "First tx operation must be lockPartyProgram");
  assert.ok(txCalls[0].sql.includes("FOR UPDATE"));
  assert.equal(txCalls[1].model, "party_programs");
  assert.equal(txCalls[1].method, "findFirst");
});

test("concurrency simulation: simultaneous first-time draft saves update draft without duplicating", async () => {
  let draftStore = null;

  const mockDb = {
    party_programs: {
      findFirst: async ({ where }) => {
        if (where.is_published === false) return draftStore;
        return { id: 1, title: "برنامج الحزب", is_published: true };
      },
      create: async ({ data }) => {
        draftStore = { id: 10, ...data, created_at: new Date(), updated_at: new Date() };
        return draftStore;
      },
      update: async ({ data }) => {
        draftStore = { ...draftStore, ...data, updated_at: new Date() };
        return draftStore;
      },
      deleteMany: async () => ({ count: 0 }),
    },
  };

  const { db } = makeDb(mockDb);

  // First save: no draft exists -> creates draft id 10
  const firstDraft = await savePartyProgramDraft({ body: "المسودة الأولى" }, actor, db);
  assert.equal(firstDraft.id, 10);
  assert.equal(firstDraft.body, "المسودة الأولى");

  // Second save: serialized after first commit -> finds existing draft id 10 and updates it
  const secondDraft = await savePartyProgramDraft({ body: "المسودة المحدثة" }, actor, db);
  assert.equal(secondDraft.id, 10, "Same draft ID updated, no second draft created");
  assert.equal(secondDraft.body, "المسودة المحدثة");
});

test("concurrency simulation: simultaneous publish results in 1 success and 1 NO_DRAFT_TO_PUBLISH", async () => {
  let draftStore = { id: 9, title: "مسودة", body: "محتوى جديد", source_note: null, is_published: false };
  let publishedStore = { id: 1, title: "برنامج الحزب", body: "محتوى قديم", is_published: true };

  const mockDb = {
    party_programs: {
      findFirst: async ({ where }) => {
        if (where.is_published === false) return draftStore;
        if (where.is_published === true) return publishedStore;
        return null;
      },
      update: async ({ data }) => {
        publishedStore = { ...publishedStore, ...data };
        return publishedStore;
      },
      delete: async () => {
        draftStore = null;
        return { id: 9 };
      },
      deleteMany: async () => ({ count: 0 }),
    },
  };

  const { db, audits } = makeDb(mockDb);

  // Request 1 publishes draft
  const res1 = await publishPartyProgramDraft(actor, db);
  assert.equal(res1.published.id, 1);
  assert.equal(res1.published.body, "محتوى جديد");
  assert.equal(audits.length, 1);
  assert.equal(audits[0].action_type, "content_published");

  // Request 2 (unblocked after lock release) sees draftStore is null -> NO_DRAFT_TO_PUBLISH
  await assert.rejects(
    async () => publishPartyProgramDraft(actor, db),
    (err) => err.code === "NO_DRAFT_TO_PUBLISH" && err.status === 400,
  );

  // No duplicate audit event written
  assert.equal(audits.length, 1, "Only one audit event should be recorded");
});

test("transaction rollback: audit failure aborts entire transaction", async () => {
  let created = false;
  const { db } = makeDb(
    {
      party_programs: {
        findFirst: async () => null,
        create: async ({ data }) => {
          created = true;
          return { id: 10, ...data };
        },
        deleteMany: async () => ({ count: 0 }),
      },
    },
    { failAudit: true },
  );

  await assert.rejects(
    async () => savePartyProgramDraft({ body: "محتوى" }, actor, db),
    (err) => err.message === "AUDIT_FAILED",
  );
  assert.equal(created, true); // create was called inside tx, but tx rolled back on audit error
});

// ---------------------------------------------------------------------------
// Standard Service and Handler Tests
// ---------------------------------------------------------------------------

test("getPartyProgramAdmin: retrieves published and draft items with paragraphs", async () => {
  const pub = {
    id: 1,
    title: "برنامج الحزب",
    body: "الفقرة الأولى\nالفقرة الثانية",
    source_note: "الموقع الرسمي",
    is_published: true,
    created_at: new Date("2026-01-01"),
    updated_at: new Date("2026-01-02"),
  };
  const draft = {
    id: 2,
    title: "مسودة البرنامج",
    body: "مسودة جديدة",
    source_note: null,
    is_published: false,
    created_at: new Date("2026-02-01"),
    updated_at: new Date("2026-02-02"),
  };

  const { db } = makeDb({
    party_programs: {
      findFirst: async ({ where }) => {
        if (where.is_published === true) return pub;
        if (where.is_published === false) return draft;
        return null;
      },
    },
  });

  const result = await getPartyProgramAdmin(db);
  assert.equal(result.has_draft, true);
  assert.equal(result.published.id, 1);
  assert.deepEqual(result.published.paragraphs, ["الفقرة الأولى", "الفقرة الثانية"]);
  assert.equal(result.draft.id, 2);
  assert.deepEqual(result.draft.paragraphs, ["مسودة جديدة"]);
});

test("getPartyProgramAdmin: handles published only and empty states", async () => {
  const { db: emptyDb } = makeDb({
    party_programs: {
      findFirst: async () => null,
    },
  });
  const emptyResult = await getPartyProgramAdmin(emptyDb);
  assert.deepEqual(emptyResult, { published: null, draft: null, has_draft: false });

  const { db: pubOnlyDb } = makeDb({
    party_programs: {
      findFirst: async ({ where }) =>
        where.is_published ? { id: 1, title: "Title", body: "Body", is_published: true } : null,
    },
  });
  const pubResult = await getPartyProgramAdmin(pubOnlyDb);
  assert.equal(pubResult.has_draft, false);
  assert.equal(pubResult.published.id, 1);
  assert.equal(pubResult.draft, null);
});

test("savePartyProgramDraft: creates new draft and records audit log without check constraint violation", async () => {
  let createdRecord = null;
  const { db, calls, audits } = makeDb({
    party_programs: {
      findFirst: async () => null, // no existing draft
      create: async ({ data }) => {
        createdRecord = { id: 10, ...data, created_at: new Date(), updated_at: new Date() };
        return createdRecord;
      },
      deleteMany: async () => ({ count: 0 }),
    },
  });

  const draft = await savePartyProgramDraft(
    { body: "محتوى المسودة الجديد", source_note: "ملاحظة" },
    actor,
    db,
  );

  assert.equal(draft.id, 10);
  assert.equal(draft.title, "برنامج الحزب");
  assert.equal(draft.body, "محتوى المسودة الجديد");
  assert.equal(draft.is_published, false);
  assert.equal(audits.length, 1);
  assert.equal(audits[0].action_type, "content_created");
  assert.equal(audits[0].details.entity_type, "party_program");
  assert.equal(audits[0].details.entity_id, "10");
  assert.equal(Object.keys(audits[0].details).every((k) => ALLOWED_AUDIT_KEYS.has(k)), true);

  const txCalls = calls.filter((c) => c.tx === "tx");
  assert.ok(txCalls.length >= 3, "calls should be wrapped in transaction including lock");
});

test("savePartyProgramDraft: updates existing draft without touching published", async () => {
  const existingDraft = {
    id: 5,
    title: "مسودة سابقة",
    body: "محتوى قديم",
    source_note: "ملاحظة قديمة",
    is_published: false,
  };

  let updatedRecord = null;
  const { db, audits } = makeDb({
    party_programs: {
      findFirst: async () => existingDraft,
      update: async ({ where, data }) => {
        assert.equal(where.id, 5);
        updatedRecord = { ...existingDraft, ...data, updated_at: new Date() };
        return updatedRecord;
      },
      deleteMany: async () => ({ count: 0 }),
    },
  });

  const draft = await savePartyProgramDraft(
    { title: "مسودة محدثة", body: "محتوى محدث" },
    actor,
    db,
  );

  assert.equal(draft.id, 5);
  assert.equal(draft.title, "مسودة محدثة");
  assert.equal(draft.body, "محتوى محدث");
  assert.equal(audits.length, 1);
  assert.equal(audits[0].action_type, "content_updated");
  assert.equal(audits[0].details.entity_type, "party_program");
  assert.equal(audits[0].details.entity_id, "5");
  assert.equal(Object.keys(audits[0].details).every((k) => ALLOWED_AUDIT_KEYS.has(k)), true);
});

test("publishPartyProgramDraft: updates published row and removes draft atomically", async () => {
  const existingPub = {
    id: 1,
    title: "البرنامج القديم",
    body: "محتوى قديم",
    source_note: "ملاحظة قديمة",
    is_published: true,
  };
  const draft = {
    id: 9,
    title: "البرنامج الجديد",
    body: "محتوى جديد معتمد",
    source_note: "ملاحظة جديدة",
    is_published: false,
  };

  let updatedPub = null;
  let deletedDraftId = null;

  const { db, audits } = makeDb({
    party_programs: {
      findFirst: async ({ where }) => {
        if (where.is_published === false) return draft;
        if (where.is_published === true) return existingPub;
        return null;
      },
      update: async ({ where, data }) => {
        assert.equal(where.id, 1, "must update published record id");
        updatedPub = { ...existingPub, ...data, updated_at: new Date() };
        return updatedPub;
      },
      delete: async ({ where }) => {
        deletedDraftId = where.id;
        return draft;
      },
      deleteMany: async () => ({ count: 0 }),
    },
  });

  const result = await publishPartyProgramDraft(actor, db);
  assert.equal(result.has_draft, false);
  assert.equal(result.draft, null);
  assert.equal(result.published.id, 1, "published row id preserved");
  assert.equal(result.published.title, "البرنامج الجديد");
  assert.equal(result.published.body, "محتوى جديد معتمد");
  assert.equal(deletedDraftId, 9, "draft record must be deleted");

  assert.equal(audits.length, 1);
  assert.equal(audits[0].action_type, "content_published");
  assert.equal(audits[0].details.entity_type, "party_program");
  assert.equal(audits[0].details.entity_id, "1");
  assert.equal(Object.keys(audits[0].details).every((k) => ALLOWED_AUDIT_KEYS.has(k)), true);
});

test("publishPartyProgramDraft: fails with NO_DRAFT_TO_PUBLISH if no draft exists", async () => {
  const { db } = makeDb({
    party_programs: {
      findFirst: async () => null,
    },
  });

  await assert.rejects(
    async () => publishPartyProgramDraft(actor, db),
    (err) => err.code === "NO_DRAFT_TO_PUBLISH" && err.status === 400,
  );
});

test("discardPartyProgramDraft: removes draft and records audit compliant with constraint", async () => {
  const draft = {
    id: 15,
    title: "مسودة مهملة",
    body: "سيتم حذفها",
    is_published: false,
  };

  let deletedCount = 0;
  const { db, audits } = makeDb({
    party_programs: {
      findFirst: async () => draft,
      deleteMany: async ({ where }) => {
        assert.equal(where.is_published, false);
        deletedCount += 1;
        return { count: 1 };
      },
    },
  });

  const result = await discardPartyProgramDraft(actor, db);
  assert.deepEqual(result, { discarded: true });
  assert.equal(deletedCount, 1);
  assert.equal(audits.length, 1);
  assert.equal(audits[0].action_type, "content_deleted");
  assert.equal(audits[0].details.entity_type, "party_program");
  assert.equal(audits[0].details.entity_id, "15");
  assert.equal(Object.keys(audits[0].details).every((k) => ALLOWED_AUDIT_KEYS.has(k)), true);
});

test("discardPartyProgramDraft: returns NOT_FOUND if no draft exists", async () => {
  const { db } = makeDb({
    party_programs: {
      findFirst: async () => null,
    },
  });

  await assert.rejects(
    async () => discardPartyProgramDraft(actor, db),
    (err) => err.code === "NOT_FOUND" && err.status === 404,
  );
});

test("handlers: permissions and authorizations", async () => {
  const getHandler = createAdminPartyProgramHandlers({
    guard: guardByRole(officer),
    getFn: async () => ({ published: null, draft: null, has_draft: false }),
  });
  const forbiddenRes = await getHandler.GET(req("GET", "http://localhost/api/admin/content/party-program"));
  assert.equal(forbiddenRes.status, 403);

  const unauthHandler = createAdminPartyProgramHandlers({
    guard: guardByRole(null),
    getFn: async () => ({ published: null, draft: null, has_draft: false }),
  });
  const unauthRes = await unauthHandler.GET(req("GET", "http://localhost/api/admin/content/party-program"));
  assert.equal(unauthRes.status, 401);
});

test("handlers: GET returns party program data for authorized staff", async () => {
  const getHandler = createAdminPartyProgramHandlers({
    guard: guardByRole(contentEditor),
    getFn: async () => ({
      published: { id: 1, title: "Title" },
      draft: null,
      has_draft: false,
    }),
  });
  const res = await getHandler.GET(req("GET", "http://localhost/api/admin/content/party-program"));
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.published.id, 1);
  assert.equal(data.has_draft, false);
});

test("handlers: PUT draft validates input and saves draft", async () => {
  let savedInput = null;
  const draftHandlers = createAdminPartyProgramDraftHandlers({
    guard: guardByRole(contentEditor),
    saveDraftFn: async (input, staff) => {
      savedInput = { input, staff: staff.role };
      return { id: 10, ...input, is_published: false };
    },
    discardFn: async () => ({ discarded: true }),
  });

  // Rejects empty body
  const emptyRes = await draftHandlers.PUT(req("PUT", "http://localhost/api/admin/content/party-program/draft", { body: "   " }));
  assert.equal(emptyRes.status, 400);

  // Rejects oversized body (> 50,000)
  const hugeRes = await draftHandlers.PUT(req("PUT", "http://localhost/api/admin/content/party-program/draft", { body: "a".repeat(50_001) }));
  assert.equal(hugeRes.status, 400);

  // Rejects unknown keys (.strict())
  const extraRes = await draftHandlers.PUT(req("PUT", "http://localhost/api/admin/content/party-program/draft", { body: "نص سليم", extra_key: 123 }));
  assert.equal(extraRes.status, 400);

  // Accepts valid body
  const validRes = await draftHandlers.PUT(req("PUT", "http://localhost/api/admin/content/party-program/draft", {
    title: "عنوان المسودة",
    body: "نص مسودة البرنامج",
    source_note: "الموقع",
  }));
  assert.equal(validRes.status, 200);
  const body = await validRes.json();
  assert.equal(body.draft.id, 10);
  assert.equal(savedInput.staff, "content_editor");
  assert.equal(savedInput.input.title, "عنوان المسودة");

  // Accepts source_note as null or empty string
  const nullSourceRes = await draftHandlers.PUT(req("PUT", "http://localhost/api/admin/content/party-program/draft", {
    title: "عنوان المسودة",
    body: "نص مسودة البرنامج",
    source_note: null,
  }));
  assert.equal(nullSourceRes.status, 200);

  const emptySourceRes = await draftHandlers.PUT(req("PUT", "http://localhost/api/admin/content/party-program/draft", {
    title: "عنوان المسودة",
    body: "نص مسودة البرنامج",
    source_note: "",
  }));
  assert.equal(emptySourceRes.status, 200);
});

test("handlers: DELETE draft validates confirm flag and discards draft", async () => {
  let discardStaff = null;
  let draftExists = true;

  const draftHandlers = createAdminPartyProgramDraftHandlers({
    guard: guardByRole(superAdmin),
    saveDraftFn: async () => ({}),
    discardFn: async (staff) => {
      if (!draftExists) return null;
      discardStaff = staff.role;
      return { discarded: true };
    },
  });

  // Rejects without confirm: true
  const noConfirmRes = await draftHandlers.DELETE(req("DELETE", "http://localhost/api/admin/content/party-program/draft", {}));
  assert.equal(noConfirmRes.status, 400);

  const falseConfirmRes = await draftHandlers.DELETE(req("DELETE", "http://localhost/api/admin/content/party-program/draft", { confirm: false }));
  assert.equal(falseConfirmRes.status, 400);

  // Accepts with confirm: true
  const validRes = await draftHandlers.DELETE(req("DELETE", "http://localhost/api/admin/content/party-program/draft", { confirm: true }));
  assert.equal(validRes.status, 200);
  assert.deepEqual(await validRes.json(), { discarded: true });
  assert.equal(discardStaff, "super_admin");

  // 404 when no draft to discard
  draftExists = false;
  const notFoundRes = await draftHandlers.DELETE(req("DELETE", "http://localhost/api/admin/content/party-program/draft", { confirm: true }));
  assert.equal(notFoundRes.status, 404);
});

test("handlers: POST publish handles draft publishing and error states", async () => {
  let publishedCalled = false;
  let hasDraft = true;

  const publishHandler = createAdminPartyProgramPublishHandler({
    guard: guardByRole(contentEditor),
    publishFn: async () => {
      if (!hasDraft) {
        const error = new Error("NO_DRAFT_TO_PUBLISH");
        error.code = "NO_DRAFT_TO_PUBLISH";
        error.status = 400;
        throw error;
      }
      publishedCalled = true;
      return { published: { id: 1, title: "Title" }, draft: null, has_draft: false };
    },
  });

  // Rejects unexpected keys
  const extraRes = await publishHandler(req("POST", "http://localhost/api/admin/content/party-program/publish", { invalid_key: "test" }));
  assert.equal(extraRes.status, 400);

  // Successfully publishes with empty body or empty object
  const validRes = await publishHandler(req("POST", "http://localhost/api/admin/content/party-program/publish", {}));
  assert.equal(validRes.status, 200);
  assert.equal(publishedCalled, true);
  const data = await validRes.json();
  assert.equal(data.published.id, 1);
  assert.equal(data.has_draft, false);

  // 400 NO_DRAFT_TO_PUBLISH when no draft exists
  hasDraft = false;
  const noDraftRes = await publishHandler(req("POST", "http://localhost/api/admin/content/party-program/publish", {}));
  assert.equal(noDraftRes.status, 400);
  assert.deepEqual(await noDraftRes.json(), { error: "NO_DRAFT_TO_PUBLISH" });
});
