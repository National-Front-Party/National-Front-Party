CREATE TYPE "staff_audit_action" AS ENUM (
  'staff_created',
  'staff_profile_updated',
  'staff_role_changed',
  'staff_activated',
  'staff_deactivated',
  'staff_password_reset'
);

CREATE TABLE "staff_audit_log" (
  "id" BIGSERIAL NOT NULL,
  "actor_id" UUID NOT NULL,
  "actor_name" TEXT NOT NULL,
  "actor_email" TEXT NOT NULL,
  "actor_staff_user_id" UUID,
  "target_id" UUID NOT NULL,
  "target_name" TEXT NOT NULL,
  "target_email" TEXT NOT NULL,
  "target_staff_user_id" UUID,
  "action_type" "staff_audit_action" NOT NULL,
  "details" JSONB,
  "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "staff_audit_log_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "staff_audit_log_actor_staff_user_id_fkey"
    FOREIGN KEY ("actor_staff_user_id") REFERENCES "staff_users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "staff_audit_log_target_staff_user_id_fkey"
    FOREIGN KEY ("target_staff_user_id") REFERENCES "staff_users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "staff_audit_log_details_safe_keys_check"
    CHECK (
      "details" IS NULL
      OR (
        jsonb_typeof("details") = 'object'
        AND "details" - ARRAY[
          'previous_role',
          'new_role',
          'previous_is_active',
          'new_is_active',
          'changed_fields'
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
          OR (
            jsonb_typeof("details"->'changed_fields') = 'array'
            AND "details"->'changed_fields'
              <@ '["full_name", "email"]'::JSONB
          )
        )
      )
    )
);

CREATE INDEX "idx_staff_audit_target_time"
  ON "staff_audit_log" ("target_id", "occurred_at" DESC);

CREATE INDEX "idx_staff_audit_actor_time"
  ON "staff_audit_log" ("actor_id", "occurred_at" DESC);

CREATE INDEX "idx_staff_audit_time"
  ON "staff_audit_log" ("occurred_at" DESC);

CREATE INDEX "idx_staff_audit_actor_fk"
  ON "staff_audit_log" ("actor_staff_user_id");

CREATE INDEX "idx_staff_audit_target_fk"
  ON "staff_audit_log" ("target_staff_user_id");
