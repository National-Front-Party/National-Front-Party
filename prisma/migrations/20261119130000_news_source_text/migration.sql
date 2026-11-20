-- Alter news_articles to allow custom/typed source names and make source_id nullable
BEGIN;

ALTER TABLE "news_articles" ADD COLUMN IF NOT EXISTS "source_name" text;
ALTER TABLE "news_articles" ALTER COLUMN "source_id" DROP NOT NULL;

-- Backfill existing articles from news_sources
UPDATE "news_articles" a
SET "source_name" = s."name_ar"
FROM "news_sources" s
WHERE a."source_id" = s."id" AND a."source_name" IS NULL;

COMMIT;
