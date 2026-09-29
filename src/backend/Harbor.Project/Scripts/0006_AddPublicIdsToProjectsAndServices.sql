ALTER TABLE "Projects" ADD COLUMN IF NOT EXISTS "PublicId" VARCHAR(50);
ALTER TABLE "Services" ADD COLUMN IF NOT EXISTS "PublicId" VARCHAR(50);

-- Populate missing PublicIds for existing Projects
UPDATE "Projects" 
SET "PublicId" = 'prj-' || lower(substring(md5(random()::text || "Id"::text) from 1 for 20)) 
WHERE "PublicId" IS NULL OR "PublicId" = '';

-- Populate missing PublicIds for existing Services
UPDATE "Services" 
SET "PublicId" = 'srv-' || lower(substring(md5(random()::text || "Id"::text) from 1 for 20)) 
WHERE "PublicId" IS NULL OR "PublicId" = '';

ALTER TABLE "Projects" ALTER COLUMN "PublicId" SET NOT NULL;
ALTER TABLE "Services" ALTER COLUMN "PublicId" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "UX_Projects_PublicId" ON "Projects" ("PublicId");
CREATE UNIQUE INDEX IF NOT EXISTS "UX_Services_PublicId" ON "Services" ("PublicId");
