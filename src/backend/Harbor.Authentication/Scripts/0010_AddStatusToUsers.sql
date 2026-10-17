ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "Status" VARCHAR(50) NOT NULL DEFAULT 'active';

UPDATE "Users"
SET "Status" = 'active'
WHERE "Status" IS NULL OR "Status" = '';
