-- Basic deployment information lives directly on the Environment row.
ALTER TABLE "Environments" ADD COLUMN IF NOT EXISTS "DeploymentUrl" VARCHAR(500);
ALTER TABLE "Environments" ADD COLUMN IF NOT EXISTS "Provider" VARCHAR(50);

-- Configuration + Secure Values share one table, distinguished by "IsSecret".
-- "Value" holds plaintext for non-secret rows and ciphertext (AES-256-GCM, base64) for secret rows.
CREATE TABLE IF NOT EXISTS "EnvironmentConfigurations" (
    "Id" SERIAL PRIMARY KEY,
    "EnvironmentId" INTEGER NOT NULL REFERENCES "Environments"("Id") ON DELETE CASCADE,
    "Key" VARCHAR(100) NOT NULL,
    "Value" TEXT NOT NULL,
    "IsSecret" BOOLEAN NOT NULL DEFAULT FALSE,
    "CreatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UQ_EnvConfig_Environment_Key" UNIQUE ("EnvironmentId", "Key")
);

CREATE INDEX IF NOT EXISTS "IX_EnvironmentConfigurations_EnvironmentId" ON "EnvironmentConfigurations" ("EnvironmentId");