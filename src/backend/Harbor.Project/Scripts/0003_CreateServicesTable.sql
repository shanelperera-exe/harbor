CREATE TABLE IF NOT EXISTS "Services" (
    "Id"             SERIAL PRIMARY KEY,
    "ProjectId"      INTEGER       NOT NULL REFERENCES "Projects"("Id") ON DELETE CASCADE,
    "Name"           VARCHAR(100)  NOT NULL,
    "Type"           VARCHAR(50)   NOT NULL,
    "RepositoryUrl"  VARCHAR(500)  NULL,
    "CreatedAt"      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "IX_Services_ProjectId" ON "Services" ("ProjectId");

-- Migrate existing repositories if any (basic migration)
INSERT INTO "Services" ("ProjectId", "Name", "Type", "RepositoryUrl")
SELECT "Id", 'Default Web Service', 'Web Service', "RepositoryUrl"
FROM "Projects"
WHERE "RepositoryUrl" IS NOT NULL AND "RepositoryUrl" != '';

-- Drop RepositoryUrl from Projects
ALTER TABLE "Projects" DROP COLUMN IF EXISTS "RepositoryUrl";
