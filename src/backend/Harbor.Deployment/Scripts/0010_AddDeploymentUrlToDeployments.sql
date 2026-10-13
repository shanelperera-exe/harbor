ALTER TABLE "Deployments" 
ADD COLUMN IF NOT EXISTS "DeploymentUrl" VARCHAR(500);

CREATE INDEX IF NOT EXISTS "IX_Deployments_ServiceId_DeploymentUrl"
ON "Deployments" ("ServiceId") WHERE "DeploymentUrl" IS NOT NULL;
