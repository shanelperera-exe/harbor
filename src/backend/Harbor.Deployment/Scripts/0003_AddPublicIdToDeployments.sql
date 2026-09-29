ALTER TABLE "Deployments" ADD COLUMN IF NOT EXISTS "PublicId" VARCHAR(50);

-- Populate missing PublicIds for existing Deployments
UPDATE "Deployments" 
SET "PublicId" = 'dep-' || lower(substring(md5(random()::text || "Id"::text) from 1 for 20)) 
WHERE "PublicId" IS NULL OR "PublicId" = '';

ALTER TABLE "Deployments" ALTER COLUMN "PublicId" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "UX_Deployments_PublicId" ON "Deployments" ("PublicId");
