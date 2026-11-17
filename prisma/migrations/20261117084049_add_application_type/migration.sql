CREATE TYPE "application_kind" AS ENUM ('member', 'volunteer', 'follower');

ALTER TABLE "membership_applications"
ADD COLUMN "application_type" "application_kind" NOT NULL DEFAULT 'member';

ALTER TABLE "membership_applications"
ALTER COLUMN "application_type" DROP DEFAULT;
