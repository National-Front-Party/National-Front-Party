-- Phase 18: party-unit organization and leadership records
-- Additive only. This migration is created for review and is NOT applied here.

CREATE TABLE "centers" (
  "id" SMALLSERIAL NOT NULL,
  "governorate_id" SMALLINT NOT NULL,
  "name_ar" TEXT NOT NULL,
  "sort_order" SMALLINT NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "centers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "centers_governorate_id_fkey"
    FOREIGN KEY ("governorate_id") REFERENCES "governorates"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "centers_governorate_name_key" UNIQUE ("governorate_id", "name_ar")
);

CREATE TABLE "local_secretariats" (
  "id" SMALLSERIAL NOT NULL,
  "center_id" SMALLINT NOT NULL,
  "name_ar" TEXT NOT NULL,
  "sort_order" SMALLINT NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "local_secretariats_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "local_secretariats_center_id_fkey"
    FOREIGN KEY ("center_id") REFERENCES "centers"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "local_secretariats_center_name_key" UNIQUE ("center_id", "name_ar")
);

CREATE TABLE "party_units" (
  "id" SMALLSERIAL NOT NULL,
  "secretariat_id" SMALLINT NOT NULL,
  "name_ar" TEXT NOT NULL,
  "description" TEXT,
  "sort_order" SMALLINT NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "party_units_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "party_units_secretariat_id_fkey"
    FOREIGN KEY ("secretariat_id") REFERENCES "local_secretariats"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "party_units_secretariat_name_key" UNIQUE ("secretariat_id", "name_ar")
);

CREATE TABLE "party_unit_people" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "party_unit_id" SMALLINT NOT NULL,
  "member_id" UUID,
  "full_name" TEXT,
  "position_title" TEXT NOT NULL,
  "details" TEXT,
  "sort_order" SMALLINT NOT NULL DEFAULT 0,
  "is_published" BOOLEAN NOT NULL DEFAULT FALSE,
  "updated_by" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "party_unit_people_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "party_unit_people_party_unit_id_fkey"
    FOREIGN KEY ("party_unit_id") REFERENCES "party_units"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "party_unit_people_member_id_fkey"
    FOREIGN KEY ("member_id") REFERENCES "members"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "party_unit_people_updated_by_fkey"
    FOREIGN KEY ("updated_by") REFERENCES "staff_users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "party_unit_people_name_or_member_check"
    CHECK ("member_id" IS NOT NULL OR NULLIF(BTRIM("full_name"), '') IS NOT NULL),
  CONSTRAINT "party_unit_people_unit_member_key"
    UNIQUE ("party_unit_id", "member_id")
);

CREATE INDEX "idx_centers_governorate" ON "centers" ("governorate_id");
CREATE INDEX "idx_local_secretariats_center" ON "local_secretariats" ("center_id");
CREATE INDEX "idx_party_units_secretariat" ON "party_units" ("secretariat_id");
CREATE INDEX "idx_party_unit_people_listing"
  ON "party_unit_people" ("party_unit_id", "is_published", "sort_order");
CREATE INDEX "idx_party_unit_people_member" ON "party_unit_people" ("member_id");
CREATE INDEX "idx_party_unit_people_updated_by" ON "party_unit_people" ("updated_by");

CREATE TRIGGER "trg_party_unit_people_updated_at"
  BEFORE UPDATE ON "party_unit_people"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
