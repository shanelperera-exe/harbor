-- Migration 0005: Add WorkflowRunId to track GitHub Actions runs for webhook-based status updates
ALTER TABLE "Deployments"
    ADD COLUMN IF NOT EXISTS "WorkflowRunId" BIGINT;

CREATE INDEX IF NOT EXISTS "IX_Deployments_WorkflowRunId"
    ON "Deployments" ("WorkflowRunId")
    WHERE "WorkflowRunId" IS NOT NULL;
