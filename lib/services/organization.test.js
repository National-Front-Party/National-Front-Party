import assert from "node:assert/strict";
import test from "node:test";
import {
  getOrganizationPartyUnitPublic,
  listOrganizationCenters,
  listOrganizationGovernorates,
  listOrganizationPartyUnits,
  searchActiveMembersForOrganization,
} from "./organization.js";

test("public organization lists include only active hierarchy branches", async () => {
  let governorateQuery;
  let centerQuery;
  let unitQuery;
  const db = {
    governorates: { findMany: async (query) => { governorateQuery = query; return [{ id: 1, name_ar: "القاهرة" }]; } },
    centers: { findMany: async (query) => { centerQuery = query; return [{ id: 2, name_ar: "مركز" }]; } },
    party_units: { findMany: async (query) => { unitQuery = query; return [{ id: 3, name_ar: "وحدة" }]; } },
  };

  assert.deepEqual(await listOrganizationGovernorates(db), [{ id: 1, name_ar: "القاهرة" }]);
  assert.deepEqual(await listOrganizationCenters(1, db), [{ id: 2, name_ar: "مركز" }]);
  assert.deepEqual(await listOrganizationPartyUnits(2, db), [{ id: 3, name_ar: "وحدة" }]);

  assert.equal(governorateQuery.where.is_active, true);
  assert.equal(governorateQuery.where.centers.some.is_active, true);
  assert.equal(governorateQuery.where.centers.some.local_secretariats.some.is_active, true);
  assert.equal(governorateQuery.where.centers.some.local_secretariats.some.party_units.some.is_active, true);
  assert.equal(centerQuery.where.governorate.is_active, true);
  assert.equal(centerQuery.where.local_secretariats.some.party_units.some.is_active, true);
  assert.equal(unitQuery.where.is_active, true);
  assert.equal(unitQuery.where.secretariat.is_active, true);
  assert.equal(unitQuery.where.secretariat.center.is_active, true);
  assert.equal(unitQuery.where.secretariat.center.governorate.is_active, true);
});

test("public party-unit details expose published people only and omit member identifiers", async () => {
  let query;
  const db = {
    party_units: {
      findFirst: async (value) => {
        query = value;
        return {
          id: 3,
          name_ar: "وحدة الحي",
          secretariat: {
            id: 4,
            name_ar: "الأمانة المحلية",
            center: {
              id: 2,
              name_ar: "المركز",
              governorate: { id: 1, name_ar: "المحافظة" },
            },
          },
          people: [
            {
              id: "person-1",
              full_name: null,
              position_title: "أمين الوحدة",
              details: "تفاصيل عامة",
              sort_order: 1,
              member: { status: "active", membership_application: { full_name: "اسم العضو" } },
              member_id: "private-member-id",
            },
          ],
        };
      },
    },
  };

  const result = await getOrganizationPartyUnitPublic(3, db);
  assert.equal(query.where.is_active, true);
  assert.equal(query.where.secretariat.is_active, true);
  assert.equal(query.where.secretariat.center.is_active, true);
  assert.equal(query.where.secretariat.center.governorate.is_active, true);
  assert.equal(query.select.people.where.is_published, true);
  assert.deepEqual(query.select.people.where.OR, [{ member_id: null }, { member: { status: "active" } }]);
  assert.deepEqual(result, {
    id: 3,
    name_ar: "وحدة الحي",
    governorate: { id: 1, name_ar: "المحافظة" },
    center: { id: 2, name_ar: "المركز" },
    local_secretariat: { id: 4, name_ar: "الأمانة المحلية" },
    people: [{
      id: "person-1",
      full_name: "اسم العضو",
      position_title: "أمين الوحدة",
      details: "تفاصيل عامة",
      sort_order: 1,
    }],
  });
  assert.equal("member_id" in result.people[0], false);
});

test("active member lookup filters inactive members and returns only safe picker fields", async () => {
  let query;
  const db = {
    members: {
      findMany: async (value) => {
        query = value;
        return [{
          id: "member-1",
          membership_application: { full_name: "عضو نشط", national_id: "private" },
          governorate: { name_ar: "القاهرة" },
          phone: "private",
        }];
      },
    },
  };

  const result = await searchActiveMembersForOrganization("عضو", db);
  assert.equal(query.where.status, "active");
  assert.deepEqual(query.where.membership_application.full_name, { contains: "عضو", mode: "insensitive" });
  assert.equal(query.take, 20);
  assert.deepEqual(result, [{ id: "member-1", full_name: "عضو نشط", governorate_name: "القاهرة" }]);
  assert.equal("national_id" in result[0], false);
  assert.equal("phone" in result[0], false);
  assert.deepEqual(await searchActiveMembersForOrganization(" ", db), []);
});
