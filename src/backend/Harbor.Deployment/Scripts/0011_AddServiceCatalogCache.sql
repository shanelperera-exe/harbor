-- Migration 0011: Add local ServiceCatalogCache projection and denormalized deployment metadata
-- so Harbor.Deployment operates autonomously on harbor_deploy without cross-DB joins.

ALTER TABLE "Deployments"
    ADD COLUMN IF NOT EXISTS "ProjectId"   INTEGER,
    ADD COLUMN IF NOT EXISTS "ServiceName" VARCHAR(200),
    ADD COLUMN IF NOT EXISTS "ProjectName" VARCHAR(200),
    ADD COLUMN IF NOT EXISTS "OwnerName"   VARCHAR(200);

CREATE TABLE IF NOT EXISTS "ServiceCatalogCache" (
    "ServiceId"        INTEGER PRIMARY KEY,
    "ServicePublicId"  VARCHAR(100),
    "ProjectId"        INTEGER NOT NULL,
    "ProjectPublicId"  VARCHAR(100),
    "ServiceName"      VARCHAR(200) NOT NULL,
    "ServiceType"      VARCHAR(100) NOT NULL DEFAULT 'web',
    "ProjectName"      VARCHAR(200) NOT NULL,
    "OwnerId"          INTEGER NOT NULL,
    "OwnerName"        VARCHAR(200),
    "IsArchived"       BOOLEAN NOT NULL DEFAULT FALSE,
    "RepositoryUrl"    VARCHAR(500),
    "RepositoryName"   VARCHAR(300),
    "RepositoryBranch" VARCHAR(200),
    "WorkflowFile"     VARCHAR(200),
    "UpdatedAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "IX_ServiceCatalogCache_ProjectId" ON "ServiceCatalogCache" ("ProjectId");
CREATE INDEX IF NOT EXISTS "IX_ServiceCatalogCache_OwnerId" ON "ServiceCatalogCache" ("OwnerId");
CREATE INDEX IF NOT EXISTS "IX_ServiceCatalogCache_RepositoryName" ON "ServiceCatalogCache" ("RepositoryName");
