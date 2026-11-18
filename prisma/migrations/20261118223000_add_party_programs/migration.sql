-- CreateTable
CREATE TABLE "party_programs" (
    "id" SMALLSERIAL NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'برنامج الحزب',
    "body" TEXT NOT NULL,
    "source_note" TEXT DEFAULT 'الموقع الرسمي للحزب',
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "party_programs_pkey" PRIMARY KEY ("id")
);

-- Trigger for updated_at
CREATE TRIGGER set_party_programs_updated_at
BEFORE UPDATE ON "party_programs"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- Initial Seed Data
INSERT INTO "party_programs" ("title", "body", "source_note", "is_published")
VALUES (
    'برنامج الحزب',
    'نص برنامج الحزب ومحاوره يضاف هنا بعد اعتماده.',
    'الموقع الرسمي للحزب',
    true
);
