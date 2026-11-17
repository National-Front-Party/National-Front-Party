ALTER TABLE "staff_users"
ADD COLUMN "password_hash" TEXT,
ADD COLUMN "must_change_password" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "last_login_at" TIMESTAMPTZ(6),
ADD COLUMN "failed_login_count" SMALLINT NOT NULL DEFAULT 0,
ADD COLUMN "locked_until" TIMESTAMPTZ(6);
