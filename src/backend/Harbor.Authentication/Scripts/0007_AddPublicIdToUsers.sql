ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "PublicId" VARCHAR(50);

-- Populate missing PublicIds for existing Users
UPDATE "Users" 
SET "PublicId" = 'usr-' || lower(substring(md5(random()::text || "Id"::text) from 1 for 20)) 
WHERE "PublicId" IS NULL OR "PublicId" = '';

ALTER TABLE "Users" ALTER COLUMN "PublicId" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "UX_Users_PublicId" ON "Users" ("PublicId");
