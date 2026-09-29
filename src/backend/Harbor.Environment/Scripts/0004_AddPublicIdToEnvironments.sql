ALTER TABLE "Environments" ADD COLUMN IF NOT EXISTS "PublicId" VARCHAR(50);

-- Populate missing PublicIds for existing Environments
UPDATE "Environments" 
SET "PublicId" = 'env-' || lower(substring(md5(random()::text || "Id"::text) from 1 for 20)) 
WHERE "PublicId" IS NULL OR "PublicId" = '';

ALTER TABLE "Environments" ALTER COLUMN "PublicId" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "UX_Environments_PublicId" ON "Environments" ("PublicId");
