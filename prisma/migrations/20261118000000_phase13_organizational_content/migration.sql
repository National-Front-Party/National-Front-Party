-- Phase 13: organizational content management (audit log, leadership content fields, central secretariat people)

-- 1) Extend staff audit for content events while preserving existing staff rows/rules
ALTER TYPE "staff_audit_action" ADD VALUE IF NOT EXISTS 'content_created';
ALTER TYPE "staff_audit_action" ADD VALUE IF NOT EXISTS 'content_updated';
ALTER TYPE "staff_audit_action" ADD VALUE IF NOT EXISTS 'content_published';
ALTER TYPE "staff_audit_action" ADD VALUE IF NOT EXISTS 'content_unpublished';
ALTER TYPE "staff_audit_action" ADD VALUE IF NOT EXISTS 'content_deleted';

ALTER TABLE "staff_audit_log"
  ALTER COLUMN "target_id" TYPE TEXT USING "target_id"::TEXT,
  ALTER COLUMN "target_email" DROP NOT NULL;

ALTER TABLE "staff_audit_log" DROP CONSTRAINT IF EXISTS "staff_audit_log_details_safe_keys_check";
ALTER TABLE "staff_audit_log"
  ADD CONSTRAINT "staff_audit_log_details_safe_keys_check"
  CHECK (
    "details" IS NULL
    OR (
      jsonb_typeof("details") = 'object'
      AND "details" - ARRAY[
        'previous_role',
        'new_role',
        'previous_is_active',
        'new_is_active',
        'changed_fields',
        'entity_type',
        'entity_id',
        'slug',
        'cascade_deleted_people_count',
        'deleted_people_count'
      ]::TEXT[] = '{}'::JSONB
      AND (
        NOT ("details" ? 'previous_role')
        OR jsonb_typeof("details"->'previous_role') = 'string'
      )
      AND (
        NOT ("details" ? 'new_role')
        OR jsonb_typeof("details"->'new_role') = 'string'
      )
      AND (
        NOT ("details" ? 'previous_is_active')
        OR jsonb_typeof("details"->'previous_is_active') = 'boolean'
      )
      AND (
        NOT ("details" ? 'new_is_active')
        OR jsonb_typeof("details"->'new_is_active') = 'boolean'
      )
      AND (
        NOT ("details" ? 'changed_fields')
        OR jsonb_typeof("details"->'changed_fields') = 'array'
      )
      AND (
        NOT ("details" ? 'entity_type')
        OR jsonb_typeof("details"->'entity_type') = 'string'
      )
      AND (
        NOT ("details" ? 'entity_id')
        OR jsonb_typeof("details"->'entity_id') = 'string'
      )
      AND (
        NOT ("details" ? 'slug')
        OR jsonb_typeof("details"->'slug') = 'string'
      )
      AND (
        NOT ("details" ? 'cascade_deleted_people_count')
        OR jsonb_typeof("details"->'cascade_deleted_people_count') = 'number'
      )
      AND (
        NOT ("details" ? 'deleted_people_count')
        OR jsonb_typeof("details"->'deleted_people_count') = 'number'
      )
    )
  );

-- 2) Leadership button/content fields in info_items (3A/3D)
ALTER TABLE "info_items"
  ADD COLUMN "button_label" TEXT,
  ADD COLUMN "person_name" TEXT,
  ADD COLUMN "person_role_title" TEXT,
  ADD COLUMN "decision_number" TEXT,
  ADD COLUMN "decision_date" DATE;

-- 3) Central secretariat people (2A)
CREATE TABLE "central_secretariat_people" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "secretariat_id" SMALLINT NOT NULL,
  "full_name" TEXT NOT NULL,
  "position_title" TEXT,
  "image_url" TEXT,
  "details" TEXT,
  "sort_order" SMALLINT NOT NULL DEFAULT 0,
  "is_published" BOOLEAN NOT NULL DEFAULT false,
  "updated_by" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "central_secretariat_people_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "central_secretariat_people_secretariat_id_fkey"
    FOREIGN KEY ("secretariat_id") REFERENCES "central_secretariats"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "central_secretariat_people_updated_by_fkey"
    FOREIGN KEY ("updated_by") REFERENCES "staff_users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "idx_csp_secretariat" ON "central_secretariat_people" ("secretariat_id");
CREATE INDEX "idx_csp_updated_by" ON "central_secretariat_people" ("updated_by");

CREATE TRIGGER "trg_csp_updated_at"
  BEFORE UPDATE ON "central_secretariat_people"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
