ALTER TABLE "ExternalIdentities" ADD COLUMN IF NOT EXISTS "ProviderUsername" VARCHAR(255) NULL;

CREATE INDEX IF NOT EXISTS "IX_ExternalIdentities_ProviderUsername"
    ON "ExternalIdentities" ("ProviderUsername")
    WHERE "ProviderUsername" IS NOT NULL;