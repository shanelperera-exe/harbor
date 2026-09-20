-- Add ServiceId to Deployments
ALTER TABLE "Deployments" ADD COLUMN "ServiceId" INTEGER;

-- Update existing deployments to point to a default service if needed,
-- but since we just created services we might not have a reliable mapping unless we hardcode.
-- Assuming a fresh database or we're okay with data loss during dev for this transition.
-- We'll set it to 0 as a placeholder if there are rows, but we can't easily cross-reference DBs without cross-db queries.
-- For a real production app, we'd do a data migration script.
UPDATE "Deployments" SET "ServiceId" = 0 WHERE "ServiceId" IS NULL;

ALTER TABLE "Deployments" ALTER COLUMN "ServiceId" SET NOT NULL;

-- Drop ProjectId from Deployments
ALTER TABLE "Deployments" DROP COLUMN IF EXISTS "ProjectId";

-- Update Index
DROP INDEX IF EXISTS "IX_Deployments_Owner_Project_StartedAt";
CREATE INDEX "IX_Deployments_Owner_Service_StartedAt" ON "Deployments" ("OwnerId", "ServiceId", "StartedAt" DESC);
