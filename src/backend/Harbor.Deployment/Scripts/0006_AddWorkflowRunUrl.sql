-- Migration 0006: Add WorkflowRunUrl for direct GitHub Actions run link
ALTER TABLE "Deployments"
    ADD COLUMN IF NOT EXISTS "WorkflowRunUrl" VARCHAR(500);
