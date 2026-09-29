-- Migration 0007: Create CiRuns table for tracking push-triggered CI runs
-- These are read-only activity records — not deployments. They let users see
-- CI history inside Harbor for workflows that are NOT the deploy workflow.
CREATE TABLE IF NOT EXISTS "CiRuns" (
    "Id"            BIGSERIAL               PRIMARY KEY,
    "ServiceId"     INTEGER                 NOT NULL,
    "OwnerId"       INTEGER                 NOT NULL,
    "WorkflowName"  VARCHAR(200)            NOT NULL,
    "WorkflowFile"  VARCHAR(200)            NOT NULL,
    "Branch"        VARCHAR(200)            NOT NULL,
    "CommitSha"     VARCHAR(100),
    "Conclusion"    VARCHAR(50),
    "Status"        VARCHAR(50)             NOT NULL,       -- GitHub status: completed, in_progress, queued
    "GitHubRunId"   BIGINT                  NOT NULL,
    "GitHubRunUrl"  VARCHAR(500),
    "StartedAt"     TIMESTAMPTZ             NOT NULL,
    "CompletedAt"   TIMESTAMPTZ,
    CONSTRAINT "FK_CiRuns_Services" FOREIGN KEY ("ServiceId") REFERENCES "Services" ("Id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IX_CiRuns_ServiceId_StartedAt"
    ON "CiRuns" ("ServiceId", "StartedAt" DESC);

CREATE INDEX IF NOT EXISTS "IX_CiRuns_OwnerId"
    ON "CiRuns" ("OwnerId");

CREATE INDEX IF NOT EXISTS "IX_CiRuns_GitHubRunId"
    ON "CiRuns" ("GitHubRunId");