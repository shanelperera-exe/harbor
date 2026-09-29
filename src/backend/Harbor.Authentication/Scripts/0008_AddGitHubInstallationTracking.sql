ALTER TABLE "ExternalIdentities"
    ADD COLUMN IF NOT EXISTS "GitHubInstallationId" BIGINT NULL;

CREATE INDEX IF NOT EXISTS "IX_ExternalIdentities_GitHubInstallationId"
    ON "ExternalIdentities" ("GitHubInstallationId")
    WHERE "GitHubInstallationId" IS NOT NULL;
