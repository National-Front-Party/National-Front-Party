/*
  Warnings:

  - Added the required column `status` to the `news_articles` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "article_status" AS ENUM ('draft', 'pending_review', 'changes_requested', 'published');

-- AlterTable
ALTER TABLE "news_articles" ADD COLUMN     "created_by" UUID,
ADD COLUMN     "review_note" TEXT,
ADD COLUMN     "reviewed_at" TIMESTAMP(6),
ADD COLUMN     "reviewed_by" UUID,
ADD COLUMN     "status" "article_status" NOT NULL;

-- AddForeignKey
ALTER TABLE "news_articles" ADD CONSTRAINT "news_articles_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "staff_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_articles" ADD CONSTRAINT "news_articles_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "staff_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
