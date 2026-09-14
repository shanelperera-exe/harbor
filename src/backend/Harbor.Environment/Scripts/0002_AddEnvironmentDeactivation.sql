ALTER TABLE "Environments" ADD COLUMN IF NOT EXISTS "IsActive" BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE "Environments" ADD COLUMN IF NOT EXISTS "DeactivatedAt" TIMESTAMP WITH TIME ZONE;
ALTER TABLE "Environments" DROP CONSTRAINT IF EXISTS "UQ_Environments_Project_Type";
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_Environments_Active_Project_Type"
    ON "Environments" ("ProjectId", "Type") WHERE "IsActive" = TRUE;
