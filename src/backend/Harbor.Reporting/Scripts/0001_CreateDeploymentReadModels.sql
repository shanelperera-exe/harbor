-- Migration 0001: Create denormalized DeploymentReadModels table for Harbor.Reporting (harbor_reporting)
-- Populated asynchronously via Kafka events (deployment-events and harbor-domain-events).
CREATE TABLE IF NOT EXISTS "DeploymentReadModels" (
    "Id"            INTEGER PRIMARY KEY,
    "PublicId"      VARCHAR(100) NOT NULL DEFAULT '',
    "ServiceId"     INTEGER NOT NULL,
    "ProjectId"     INTEGER NOT NULL DEFAULT 0,
    "OwnerId"       INTEGER NOT NULL DEFAULT 0,
    "ProjectName"   VARCHAR(200),
    "ServiceName"   VARCHAR(200),
    "UserName"      VARCHAR(200),
    "Environment"   VARCHAR(100) NOT NULL,
    "Version"       VARCHAR(200) NOT NULL DEFAULT '',
    "CommitSha"     VARCHAR(100),
    "CommitMessage" TEXT,
    "Status"        VARCHAR(50) NOT NULL,
    "StartedAt"     TIMESTAMPTZ NOT NULL,
    "CompletedAt"   TIMESTAMPTZ,
    "FailureReason" TEXT
);

CREATE INDEX IF NOT EXISTS "IX_DeploymentReadModels_OwnerId" ON "DeploymentReadModels" ("OwnerId");
CREATE INDEX IF NOT EXISTS "IX_DeploymentReadModels_ProjectId" ON "DeploymentReadModels" ("ProjectId");
CREATE INDEX IF NOT EXISTS "IX_DeploymentReadModels_ServiceId" ON "DeploymentReadModels" ("ServiceId");
CREATE INDEX IF NOT EXISTS "IX_DeploymentReadModels_StartedAt" ON "DeploymentReadModels" ("StartedAt" DESC, "Id" DESC);
